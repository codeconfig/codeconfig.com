export interface Clarity {
    Metadata:  Metadata;
    Resources: Resources;
}

export interface Metadata {
    product_id:     string;
    environment_id: string;
    package_id:     string;
}

export interface Resources {
    StorageAccount: StorageAccount[];
    KeyVault:       KeyVault[];
    AppServicePlan:       AppServicePlan[];
    WebApp:       WebApp[];
}

export interface KeyVault {
    Name:    string;
    Secrets: Secret[];
}

export interface Secret {
    Name: string;
    Value: string;
}

export interface StorageAccount {
    Name:       string;
    PrimaryKey: null;
}

export interface AppServicePlan {
    Name:       string;
}

export interface WebApp {
    Name:       string;
    AppServicePlanId : string;
}
