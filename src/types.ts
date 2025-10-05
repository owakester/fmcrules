export interface RawPolicy {
  policy: PolicySummary;
  rules: RawRule[];
}

export interface PolicySummary {
  id: string;
  name: string;
  description?: string;
}

export interface RawRule {
  id: string;
  name: string;
  action?: string;
  enabled?: boolean;
  metadata?: Record<string, unknown>;
  commentHistoryList?: Array<{ comment: string; createdBy?: string; createdOn?: string }>;
  ruleIndex?: number;
  section?: { name?: string };
  sourceZones?: { items?: NamedEntity[] };
  destinationZones?: { items?: NamedEntity[] };
  sourceNetworks?: NamedCollection;
  destinationNetworks?: NamedCollection;
  sourceDynamicObjects?: NamedCollection;
  destinationDynamicObjects?: NamedCollection;
  sourcePorts?: NamedCollection;
  destinationPorts?: NamedCollection;
  applications?: NamedCollection;
  urls?: NamedCollection;
  variableSet?: NamedCollection | NamedEntity;
  ipsPolicy?: NamedEntity;
  filePolicy?: NamedEntity;
  timeRangeObjects?: NamedCollection;
  sourceSecurityGroupTags?: NamedCollection;
  snmpConfig?: NamedCollection;
  logBegin?: boolean;
  logEnd?: boolean;
  logFiles?: boolean;
  enableSyslog?: boolean;
  sendEventsToFMC?: boolean;
}

export interface NamedCollection {
  items?: NamedEntity[];
  objects?: NamedEntity[];
  applications?: NamedEntity[];
}

export interface NamedEntity {
  id?: string;
  name?: string;
  value?: string;
  url?: string;
}

export interface RuleRow {
  policyName: string;
  policyId: string;
  policyDescription: string;
  ruleName: string;
  ruleId: string;
  action: string;
  enabled: boolean;
  section: string;
  index: number;
  sourceZones: string[];
  destinationZones: string[];
  sourceNetworks: string[];
  destinationNetworks: string[];
  sourceDynamicObjects: string[];
  destinationDynamicObjects: string[];
  sourcePorts: string[];
  destinationPorts: string[];
  applications: string[];
  urls: string[];
  variableSet: string[];
  ipsPolicy: string[];
  filePolicy: string[];
  timeRanges: string[];
  securityGroupTags: string[];
  snmpAlerts: string[];
  logBegin: boolean | null;
  logEnd: boolean | null;
  logFiles: boolean | null;
  enableSyslog: boolean | null;
  sendEventsToFMC: boolean | null;
  comments: string[];
}

export interface RuleFilters {
  search: string;
  policyId: string | null;
  action: string | null;
  enabledOnly: boolean;
}