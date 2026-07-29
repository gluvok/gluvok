/**
 * @file lib/constants/enums.ts
 * @description Constants registry and configuration values for enums.
 */

export enum Role {
  SUPER_ADMIN = "super_admin",
  ADMIN = "admin",
  MANAGER = "manager",
  OPERATOR = "operator",
  BASE = "base",
  HARDWARE = "hardware",
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

export enum WeighmentType {
  IN = "in",
  OUT = "out",
}

export enum RoleLabel {
  SUPER_ADMIN = "SUPER ADMIN",
  ADMIN = "ADMIN",
  MANAGER = "MANAGER",
  OPERATOR = "OPERATOR",
  BASE = "BASE",
  HARDWARE = "HARDWARE",
}

export const SingularEntityName = {
  CENTER: "Center",
  COMMODITY: "Commodity",
  RATE: "Rate",
  CUSTOMER: "Customer",
  WEIGHMENT: "Weighment",
  FACTORY: "Factory",
  PROFILE: "Profile",
  USER: "User",
} as const
export type SingularEntityName = typeof SingularEntityName[keyof typeof SingularEntityName]

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
  WEIGHT: "Weight",
  COMMODITY_ID: "Commodity ID",
  COMMODITY_NAME: "Commodity Name",
  RATE_ID: "Rate ID",
  CENTER_ID: "Center ID",
  PROFILE_ID: "Profile ID",
  CUSTOMER_ID: "Customer ID",
  EMAIL: "Email",
  ROLE: "Role",
  CREATED_AT: "Created At",
  UPDATED_AT: "Updated At",
  IMAGES: "Images",
  USER_ID: "User ID",
  IS_ACTIVE: "Status",
  FACTORY_NAME: "Factory Name",
  PROFILE_NAME: "Profile Name",
  CUSTOMER_NAME: "Customer Name",
  CENTER_NAME: "Center Name",
  USER_EMAIL: "User Email",
  USERNAME: "Username",
  PASSWORD: "Password",
} as const
export type ColumnLabel = typeof ColumnLabel[keyof typeof ColumnLabel]

export enum DialogMode {
  CREATE = "create",
  EDIT = "edit",
}

export enum ActiveStatus {
  ACTIVE = "Active",
  INACTIVE = "Inactive",
}

export enum AppRoutes {
  HOME = "/",
  LOGIN = "/login",
  SIGNUP = "/signup",
  FORGOT_PASSWORD = "/forgot-password",
  RESET_PASSWORD = "/reset-password",
  SERVICES = "/services",
  SUPPORT = "/support",
  FEEDBACK = "/feedback",
}

export enum ApiRoutes {
  AUTH_LOGIN = "/api/auth/login",
  AUTH_ME = "/api/auth/me",
  PROFILES = "/api/profiles",
  CUSTOMERS = "/api/customers",
  FACTORIES = "/api/factories",
  CENTERS = "/api/centers",
  RATES = "/api/rates",
  WEIGHMENTS = "/api/weighments",
  COMMODITIES = "/api/commodities",
  USERS = "/api/users",
}

export enum ProjectSlug {
  CENTERS = "centers",
  COMMODITIES = "commodities",
  RATES = "rates",
  CUSTOMERS = "customers",
  WEIGHMENTS = "weighments",
  FACTORIES = "factories",
  PROFILES = "profiles",
}

export enum FieldType {
  TEXT = "text",
  NUMBER = "number",
  IMAGES = "images",
  ROLE = "role",
  UNIT = "unit",
  TYPE = "type",
  CHECKBOX = "checkbox",
}

export enum EntityKey {
  ID = "id",
  NAME = "name",
  USERNAME = "username",
  PASSWORD = "password",
  FACTORY_ID = "factory_id",
  UNIT_PRICE = "unit_price",
  UNIT = "unit",
  TYPE = "type",
  FATHER_NAME = "father_name",
  VEHICLE_NUMBER = "vehicle_number",
  WEIGHT = "weight",
  COMMODITY_ID = "commodity_id",
  COMMODITY_NAME = "commodity_name",
  RATE_ID = "rate_id",
  CENTER_ID = "center_id",
  PROFILE_ID = "profile_id",
  CUSTOMER_ID = "customer_id",
  EMAIL = "email",
  USER_EMAIL = "user_email",
  ROLE = "role",
  CREATED_AT = "created_at",
  UPDATED_AT = "updated_at",
  AADHAR_NUMBER = "aadhar_number",
  GOVT_ID = "govt_id",
  IMAGES = "images",
  USER_ID = "user_id",
  IS_ACTIVE = "is_active",
  FACTORY_NAME = "factory_name",
  PROFILE_NAME = "profile_name",
  PROFILE_AADHAR = "profile_aadhar",
  CUSTOMER_NAME = "customer_name",
  CENTER_NAME = "center_name",
  CUSTOMER_GOVT_ID = "customer_govt_id",
  COMMODITY = "commodity",
  FACTORY = "factory",
  USER = "user",
  RATE = "rate",
  CENTER = "center",
  PROFILE = "profile",
  CUSTOMER = "customer",
}

export enum InputMode {
  NONE = "none",
  TEXT = "text",
  TEL = "tel",
  URL = "url",
  EMAIL = "email",
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
}

export enum ProjectName {
  CENTERS = "Centers",
  COMMODITIES = "Commodities",
  RATES = "Rates",
  CUSTOMERS = "Customers",
  WEIGHMENTS = "Weighments",
  FACTORIES = "Factories",
  PROFILES = "Profiles",
}

export enum SystemSlug {
  USERS = "users",
}

export enum DatePreset {
  TODAY = "today",
  YESTERDAY = "yesterday",
  LAST_2_DAYS = "2days",
  LAST_7_DAYS = "7days",
  THIS_MONTH = "thisMonth",
}



