/**
 * @file lib/constants/enums.ts
 * @description Constants registry and configuration values for enums.
 */

export enum Role {
  ADMIN = "admin",
  MANAGER = "manager",
  OPERATOR = "operator",
  BASE = "base",
}

export enum Unit {
  KG = "kg",
  Q = "q",
  GAL = "gal",
}

export enum FieldSpan {
  FULL = "full",
  HALF = "half",
  THIRD = "third",
}

export enum EntryStatus {
  PENDING = "pending",
  APPROVED = "approved",
  REJECTED = "rejected",
}

export enum EntryType {
  MANUAL = "manual",
  AUTOMATIC = "automatic",
}

export enum WeighmentType {
  UNASSIGNED = "unassigned",
  IN = "in",
  OUT = "out",
}

export enum FieldRequirementMode {
  MANDATORY = "mandatory",
  OPTIONAL = "optional",
  NOT_REQUIRED = "not_required",
}

export const SingularEntityName = {
  CENTER: "Center",
  COMMODITY: "Commodity",
  RATE: "Rate",
  CUSTOMER: "Customer",
  WEIGHMENT: "Weighment",
  ENTRY: "Entry",
  FACTORY: "Factory",
  USER: "User",
  SETTING: "Setting",
} as const;
export type SingularEntityName = (typeof SingularEntityName)[keyof typeof SingularEntityName];

export const ColumnLabel = {
  ...SingularEntityName,
  ID: "ID",
  GOVT_ID: "Govt ID",
  AADHAR_NUMBER: "Aadhar Number",
  NAME: "Name",
  FACTORY_ID: "Factory ID",
  UNIT_PRICE: "Unit Price",
  UNIT: "Unit",
  TYPE: "Type",
  FATHER_NAME: "Father's Name",
  VEHICLE_NUMBER: "Vehicle Number",
  DETECTED_VEHICLE_NUMBER: "Detected Vehicle Number",
  STATUS: "Status",
  WEIGHT: "Weight",
  COMMODITY_ID: "Commodity ID",
  COMMODITY_NAME: "Commodity Name",
  RATE_ID: "Rate ID",
  CENTER_ID: "Center ID",
  CUSTOMER_ID: "Customer ID",
  ROLE: "Role",
  CREATED_AT: "Created At",
  UPDATED_AT: "Updated At",
  DELETED_AT: "Deleted At",
  IMAGES: "Images",
  USER_ID: "User ID",
  FACTORY_NAME: "Factory Name",
  USER_NAME: "User Name",
  CUSTOMER_NAME: "Customer Name",
  CENTER_NAME: "Center Name",
  USERNAME: "Username",
  PASSWORD: "Password",
  CONFIRM_PASSWORD: "Confirm Password",
  AADHAR_NUMBER_MODE: "Aadhaar Number Mode",
  GOVT_ID_MODE: "Govt ID Mode",
  IN_ENTRY_ID: "In-Entry ID",
  OUT_ENTRY_ID: "Out-Entry ID",
  IN_ENTRY_CREATED_AT: "In-Entry Time",
  OUT_ENTRY_CREATED_AT: "Out-Entry Time",
  GROSS_WEIGHT: "Gross Weight",
  TARE_WEIGHT: "Tare Weight",
  NET_WEIGHT: "Net Weight",
  IN_CENTER_ID: "In-Center ID",
  IN_CENTER_NAME: "In-Center Name",
  OUT_CENTER_ID: "Out-Center ID",
  OUT_CENTER_NAME: "Out-Center Name",
  IN_USER_ID: "In-User ID",
  IN_USER_NAME: "In-User Name",
  OUT_USER_ID: "Out-User ID",
  OUT_USER_NAME: "Out-User Name",
  IN_CUSTOMER_ID: "In-Customer ID",
  IN_CUSTOMER_NAME: "In-Customer Name",
  OUT_CUSTOMER_ID: "Out-Customer ID",
  OUT_CUSTOMER_NAME: "Out-Customer Name",
} as const;
export type ColumnLabel = (typeof ColumnLabel)[keyof typeof ColumnLabel];

export enum DialogMode {
  CREATE = "create",
  EDIT = "edit",
}

export enum AppRoutes {
  HOME = "/",
  LOGIN = "/login",
  SERVICES = "/services",
  SUPPORT = "/support",
  FEEDBACK = "/feedback",
}

export enum ApiRoutes {
  AUTH_LOGIN = "/api/auth/login",
  AUTH_DEVICE_LOGIN = "/api/auth/device/login",
  AUTH_REFRESH = "/api/auth/refresh",
  AUTH_LOGOUT = "/api/auth/logout",
  AUTH_ME = "/api/auth/me",
  CUSTOMERS = "/api/customers",
  CENTERS = "/api/centers",
  RATES = "/api/rates",
  ENTRIES = "/api/entries",
  DEVICE_ENTRIES = "/api/device/entries",
  WEIGHMENTS = "/api/weighments",
  COMMODITIES = "/api/commodities",
  USERS = "/api/users",
  SETTINGS = "/api/settings",
  FILTERS_PRELOAD = "/api/filters/preload",
}

export enum ProjectSlug {
  CENTERS = "centers",
  COMMODITIES = "commodities",
  RATES = "rates",
  CUSTOMERS = "customers",
  ENTRIES = "entries",
  WEIGHMENTS = "weighments",
  USERS = "users",
  SETTINGS = "settings",
}

export enum FieldType {
  TEXT = "text",
  NUMBER = "number",
  PASSWORD = "password",
  IMAGES = "images",
  ROLE = "role",
  UNIT = "unit",
  TYPE = "type",
  CHECKBOX = "checkbox",
  FIELD_REQUIREMENT_MODE = "field_requirement_mode",
  ENTRY_STATUS = "entry_status",
}

export enum EntityKey {
  ID = "id",
  NAME = "name",
  USERNAME = "username",
  PASSWORD = "password",
  PASSWORD_HASH = "password_hash",
  FACTORY_ID = "factory_id",
  UNIT_PRICE = "unit_price",
  UNIT = "unit",
  TYPE = "type",
  FATHER_NAME = "father_name",
  VEHICLE_NUMBER = "vehicle_number",
  DETECTED_VEHICLE_NUMBER = "detected_vehicle_number",
  STATUS = "status",
  WEIGHT = "weight",
  COMMODITY_ID = "commodity_id",
  COMMODITY_NAME = "commodity_name",
  RATE_ID = "rate_id",
  CENTER_ID = "center_id",
  CUSTOMER_ID = "customer_id",
  ROLE = "role",
  CREATED_AT = "created_at",
  UPDATED_AT = "updated_at",
  DELETED_AT = "deleted_at",
  AADHAR_NUMBER = "aadhar_number",
  GOVT_ID = "govt_id",
  IMAGES = "images",
  USER_ID = "user_id",
  FACTORY_NAME = "factory_name",
  USER_NAME = "user_name",
  CUSTOMER_NAME = "customer_name",
  CENTER_NAME = "center_name",
  CUSTOMER_GOVT_ID = "customer_govt_id",
  COMMODITY = "commodity",
  FACTORY = "factory",
  USER = "user",
  RATE = "rate",
  CENTER = "center",
  CUSTOMER = "customer",
  CONFIRM_PASSWORD = "confirmPassword",
  AADHAR_NUMBER_MODE = "aadhar_number_mode",
  GOVT_ID_MODE = "govt_id_mode",
  IN_ENTRY_ID = "in_entry_id",
  OUT_ENTRY_ID = "out_entry_id",
  IN_ENTRY_CREATED_AT = "in_entry_created_at",
  OUT_ENTRY_CREATED_AT = "out_entry_created_at",
  GROSS_WEIGHT = "gross_weight",
  TARE_WEIGHT = "tare_weight",
  NET_WEIGHT = "net_weight",
  IN_CENTER_ID = "in_center_id",
  IN_CENTER_NAME = "in_center_name",
  OUT_CENTER_ID = "out_center_id",
  OUT_CENTER_NAME = "out_center_name",
  IN_USER_ID = "in_user_id",
  IN_USER_NAME = "in_user_name",
  OUT_USER_ID = "out_user_id",
  OUT_USER_NAME = "out_user_name",
  IN_CUSTOMER_ID = "in_customer_id",
  IN_CUSTOMER_NAME = "in_customer_name",
  OUT_CUSTOMER_ID = "out_customer_id",
  OUT_CUSTOMER_NAME = "out_customer_name",
  TOKEN_VERSION = "token_version",
}

export enum InputMode {
  NONE = "none",
  TEXT = "text",
  TEL = "tel",
  URL = "url",
  NUMERIC = "numeric",
  DECIMAL = "decimal",
  SEARCH = "search",
}

export enum CommodityName {
  WHEAT = "Wheat",
  CORN = "Corn",
  CRUDE_OIL = "Crude Oil",
  SCRAP_COPPER = "Scrap Copper",
  BARLEY = "Barley",
  WINE = "Wine",
  CABLE = "Cable",
}

export enum ProjectName {
  CENTERS = "Centers",
  COMMODITIES = "Commodities",
  RATES = "Rates",
  CUSTOMERS = "Customers",
  ENTRIES = "Entries",
  WEIGHMENTS = "Weighments",
  FACTORIES = "Factories",
  USERS = "Users",
  SETTINGS = "Settings",
}

export enum DatePreset {
  TODAY = "today",
  YESTERDAY = "yesterday",
  LAST_2_DAYS = "2days",
  LAST_7_DAYS = "7days",
  THIS_MONTH = "thisMonth",
}

export enum DbEnum {
  ROLE = "role_enum",
  UNIT = "unit_enum",
  ENTRY_TYPE = "entry_type",
  WEIGHMENT_TYPE = "weighment_type",
  FIELD_REQUIREMENT_MODE = "field_requirement_mode",
  ENTRY_STATUS = "entry_status",
}

export enum TableName {
  FACTORIES = "factories",
  CENTERS = "centers",
  COMMODITIES = "commodities",
  RATES = "rates",
  USERS = "users",
  CUSTOMERS = "customers",
  ENTRIES = "entries",
  WEIGHMENTS = "weighments",
}

export enum RelationAlias {
  IN_ENTRY = "in_entry",
  OUT_ENTRY = "out_entry",
}

export enum ApiPrefix {
  API = "/api/",
  NEXT = "/_next",
  FAVICON = "/favicon.ico",
}

export enum RequestHeader {
  HOST = "host",
  USER_ID = "x-user-id",
  USERNAME = "x-user-username",
  NAME = "x-user-name",
  ROLE = "x-user-role",
  FACTORY_ID = "x-user-factory-id",
  MICROCONTROLLER_SECRET = "x-microcontroller-secret",
}

export enum PermissionKey {
  READ = "read",
  WRITE = "write",
  EDIT_FIELD = "edit_field",
  DELETE = "delete",
  CREATE = "create",
  SHOW = "show",
  FILTER = "filter",
}

export enum QueryParam {
  NEXT = "next",
  SEARCH = "search",
  PAGE = "page",
  LIMIT = "limit",
  SORT_COLUMN = "sort_column",
  SORT_DESC = "sort_desc",
  START_DATE = "start_date",
  END_DATE = "end_date",
}

export enum CookieName {
  TOKEN = "token",
  REFRESH_TOKEN = "refresh_token",
}

export enum AutoComplete {
  NEW_PASSWORD = "new-password",
  OFF = "off",
}

export enum InputStep {
  ANY = "any",
}

export enum FilterValue {
  ALL = "all",
}
