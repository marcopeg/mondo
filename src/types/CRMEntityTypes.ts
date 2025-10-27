import crmConfig from "@/crm-config.json";

// Types derived from the CRM config JSON schema
export type CRMConfig = typeof crmConfig;
export type CRMEntityConfigRecord = CRMConfig["entities"];
export type CRMEntityType = Extract<keyof CRMEntityConfigRecord, string>;
