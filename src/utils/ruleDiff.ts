import type { FieldChange, ModifiedRuleChange, RuleChangeReport, RuleRow } from "../types";

function computeFingerprint(rules: RuleRow[]): string {
  const json = JSON.stringify(
    rules.map((rule) => [
      rule.policyId,
      rule.ruleId || rule.ruleName,
      rule.action,
      rule.enabled,
      rule.section,
      rule.index,
      rule.sourceNetworks,
      rule.destinationNetworks,
      rule.applications,
      rule.urls,
      rule.comments.map((comment) => [comment.text, comment.user, comment.date])
    ])
  );
  let hash = 0;
  for (let i = 0; i < json.length; i += 1) {
    hash = (hash * 31 + json.charCodeAt(i)) | 0;
  }
  return (hash >>> 0).toString(16);
}

function serializeArray(values: string[]): string {
  return values.length ? values.join(", ") : "-";
}

function serializeComments(values: RuleRow["comments"]): string {
  if (!values.length) {
    return "-";
  }
  return values
    .map((comment) => {
      const parts: string[] = [];
      if (comment.text) {
        parts.push(comment.text);
      }
      const meta: string[] = [];
      if (comment.user) {
        meta.push(comment.user);
      }
      if (comment.date) {
        meta.push(comment.date);
      }
      if (meta.length) {
        parts.push(`(${meta.join(" - ")})`);
      }
      return parts.join(" ");
    })
    .join(" | ");
}

function formatBoolean(value: boolean | null): string {
  if (value === null) {
    return "N/D";
  }
  return value ? "Sí" : "No";
}

const FIELD_DEFINITIONS: Array<{ field: keyof RuleRow; label: string }> = [
  { field: "policyDefaultAction", label: "Accion por defecto" },
  { field: "policyDefaultLogBegin", label: "Log inicio por defecto" },
  { field: "policyDefaultLogEnd", label: "Log fin por defecto" },
  { field: "policyDefaultEnableSyslog", label: "Syslog por defecto" },
  { field: "policyDefaultSendEventsToFMC", label: "Eventos FMC por defecto" },
  { field: "action", label: "Acción" },
  { field: "enabled", label: "Estado" },
  { field: "section", label: "Sección" },
  { field: "index", label: "Índice" },
  { field: "sourceZones", label: "Zonas origen" },
  { field: "destinationZones", label: "Zonas destino" },
  { field: "sourceNetworks", label: "Redes origen" },
  { field: "destinationNetworks", label: "Redes destino" },
  { field: "sourceDynamicObjects", label: "Objetos dinámicos origen" },
  { field: "destinationDynamicObjects", label: "Objetos dinámicos destino" },
  { field: "sourcePorts", label: "Puertos origen" },
  { field: "destinationPorts", label: "Puertos destino" },
  { field: "applications", label: "Aplicaciones" },
  { field: "urls", label: "URLs" },
  { field: "variableSet", label: "Variable set" },
  { field: "ipsPolicy", label: "IPS" },
  { field: "filePolicy", label: "File policy" },
  { field: "timeRanges", label: "Time ranges" },
  { field: "securityGroupTags", label: "Security group tags" },
  { field: "snmpAlerts", label: "SNMP alerts" },
  { field: "logBegin", label: "Log inicio" },
  { field: "logEnd", label: "Log fin" },
  { field: "logFiles", label: "Log archivos" },
  { field: "enableSyslog", label: "Syslog" },
  { field: "sendEventsToFMC", label: "Eventos FMC" },
  { field: "comments", label: "Comentarios" }
];

function serializeField(row: RuleRow, field: keyof RuleRow): string {
  const value = row[field];
  switch (field) {
    case "enabled":
    case "logBegin":
    case "logEnd":
    case "logFiles":
    case "enableSyslog":
    case "sendEventsToFMC":
      return formatBoolean(value as boolean | null);
    case "sourceZones":
    case "destinationZones":
    case "sourceNetworks":
    case "destinationNetworks":
    case "sourceDynamicObjects":
    case "destinationDynamicObjects":
    case "sourcePorts":
    case "destinationPorts":
    case "applications":
    case "urls":
    case "variableSet":
    case "ipsPolicy":
    case "filePolicy":
    case "timeRanges":
    case "securityGroupTags":
    case "snmpAlerts":
      return serializeArray(value as string[]);
    case "comments":
      return serializeComments(value as RuleRow["comments"]);
    case "index":
      return String(value ?? "");
    default:
      return (value ?? "") as string;
  }
}

function buildRuleKey(rule: RuleRow): string {
  const id = rule.ruleId || rule.ruleName;
  return `${rule.policyId}::${id}`;
}

export function diffRuleSets(currentRules: RuleRow[] = [], baselineRules: RuleRow[] = []): RuleChangeReport {
  const currentMap = new Map<string, RuleRow>();
  const baselineMap = new Map<string, RuleRow>();

  currentRules.forEach((rule) => {
    currentMap.set(buildRuleKey(rule), rule);
  });

  baselineRules.forEach((rule) => {
    baselineMap.set(buildRuleKey(rule), rule);
  });

  const added: RuleRow[] = [];
  const removed: RuleRow[] = [];
  const modified: ModifiedRuleChange[] = [];

  currentMap.forEach((rule, key) => {
    const baseline = baselineMap.get(key);
    if (!baseline) {
      added.push(rule);
      return;
    }
    const changes: FieldChange[] = [];
    FIELD_DEFINITIONS.forEach(({ field, label }) => {
      const before = serializeField(baseline, field);
      const after = serializeField(rule, field);
      if (before !== after) {
        changes.push({ field, label, previous: before, current: after });
      }
    });
    if (changes.length) {
      modified.push({
        key,
        policyId: rule.policyId,
        policyName: rule.policyName,
        ruleId: rule.ruleId,
        ruleName: rule.ruleName,
        baseline,
        current: rule,
        changes,
      });
    }
  });

  baselineMap.forEach((rule, key) => {
    if (!currentMap.has(key)) {
      removed.push(rule);
    }
  });

  return {
    summary: {
      totalCurrentRules: currentRules.length,
      totalBaselineRules: baselineRules.length,
      addedRules: added.length,
      removedRules: removed.length,
      modifiedRules: modified.length,
    },
    added,
    removed,
    modified,
    baselineHash: computeFingerprint(baselineRules),
    currentHash: computeFingerprint(currentRules),
    baselineLabel: '',
    currentLabel: '',
  };
}
