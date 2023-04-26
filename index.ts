import * as pulumi from "@pulumi/pulumi";
import * as resources from "@pulumi/azure-native/resources";
import * as storage from "@pulumi/azure-native/storage";
import * as appservice from "@pulumi/azure-native/web";
import * as keyvault from "@pulumi/azure-native/keyvault";
import { AppServicePlan, Clarity, WebApp } from "./models/claritymodels";

import * as fs from 'fs'
import * as YAML from 'yaml'

/** 
YAML.parse('3.14159')
// 3.14159

YAML.parse('[ true, false, maybe, null ]\n')
// [ true, false, 'maybe', null ]
const data = fs.readFileSync(require.resolve("./service01.yaml"), { encoding: "utf8" });
var p = YAML.parse(data);
**/

let parsedSchema : any;
let resourceOutput = new Map<string, pulumi.Output<any>>();
let productId : string;
let instanceId : string;
let environmentId : string;
const yaml = require('js-yaml');
const fs1   = require('fs');

const tampax = require('tampax');


const JoinYamlType = new yaml.Type('!join', {
    kind: 'sequence',
    construct: (data: any[]) => data.join(''),    
})

const RefYamlType = new yaml.Type('!Ref', {
    kind: 'sequence',
    construct: (data: any[]) => {return "${" + data.join('.')+ "}"} 
})

const CLWebAppNameYamlType = new yaml.Type('!clWebAppName', {
    kind: 'sequence',
    construct: (data: any[]) => {
        return `apsvc${environmentId}${productId}${instanceId}` + data.join("");
    } 
})

const CLAppSvcNameYamlType = new yaml.Type('!clAppSvcName', {
    kind: 'sequence',
    construct: (data: any[]) => {
        return `apspl${environmentId}${productId}${instanceId}` + data.join("");
    } 
})

const CLKVNameYamlType = new yaml.Type('!clKVName', {
    kind: 'sequence',
    construct: (data: any[]) => {
        return `kv${environmentId}${productId}${instanceId}` + data.join("");
    } 
})


const CLStracNameYamlType = new yaml.Type('!clStracName', {
    kind: 'sequence',
    construct: (data: any[]) => {
        return `strac${environmentId}${productId}${instanceId}` + data.join("");
    } 
})

const IncludeYamlType = new yaml.Type('!include', {
    kind: 'scalar',
    construct (dataPath:string) {
        return yaml.load(fs1.readFileSync(require.resolve("./ClarityResourceSchema.yaml"),"utf8"));
    } 
})

productId = "newdoc";
environmentId = "ndcc1";
instanceId = "01"

const schema = yaml.DEFAULT_SCHEMA.extend([IncludeYamlType, JoinYamlType, RefYamlType, CLStracNameYamlType,CLKVNameYamlType,CLAppSvcNameYamlType,CLWebAppNameYamlType]);

function GetValue<T>(output: pulumi.Output<T>) {
    return new Promise<T>((resolve, reject)=>{
        output.apply(value=>{
            resolve(value);
        });
    });
}


const resourceSchema = yaml.load(fs1.readFileSync(require.resolve("./service01.yaml"),"utf8"), { schema });
// Create an Azure Resource Group
const resourceGroup = new resources.ResourceGroup("resourceGroup", {
    resourceGroupName : "resourceGroupead48778"
});



tampax.yamlParseString(YAML.stringify(resourceSchema), {}, (err:any, data:Clarity) => {
    if (err) {
       throw err;
    }
    parsedSchema = data;
    data.Resources.StorageAccount.forEach((stor: any) => {
        // Create an Azure resource (Storage Account)
        const storageAccount = new storage.StorageAccount(stor.Name, {
            resourceGroupName: resourceGroup.name,
            accountName: stor.Name,
            sku: {
                name: storage.SkuName.Standard_LRS,
            },
            kind: storage.Kind.StorageV2,
        });
        let storageKeys = storage.listStorageAccountKeysOutput({
            resourceGroupName: resourceGroup.name,
            accountName: stor.Name
        });

        resourceOutput.set(`$\{Resources.StorageAccount.${stor.Name}.PrimaryKey\}`, storageKeys.keys[0].value);
    }); 

    data.Resources.KeyVault.forEach(function (kv: any) {
        const keyVault = new keyvault.Vault(kv.Name, {
            properties: {
                accessPolicies: [{
                    objectId: "00000000-0000-0000-0000-000000000000",
                    permissions: {},
                    tenantId: "2a15a8b5-49d1-49bc-b63c-c7c8c87bdc57",
                }],
                sku: {
                    family: "A",
                    name: keyvault.SkuName.Standard,
                },
                tenantId: "2a15a8b5-49d1-49bc-b63c-c7c8c87bdc57",
            },
            resourceGroupName: resourceGroup.name,
            vaultName : `${kv.Name}`,
        });
    }); 

    data.Resources.AppServicePlan.forEach(function (appsvc: AppServicePlan) {
     
        const appServicePlan = new appservice.AppServicePlan(appsvc.Name, {
            kind: "app",
            name: appsvc.Name,
            resourceGroupName: resourceGroup.name,
            sku: {
                capacity: 1,
                family: "P",
                name: "P1",
                size: "P1",
                tier: "Premium",
            },
        });
        resourceOutput.set(`$\{Resources.AppServicePlan.${appsvc.Name}.Id\}`, appServicePlan.id);

    }); 
  });

  tampax.yamlParseString(YAML.stringify(parsedSchema),{}, (err:any, data:Clarity) => {
    if (err) {
       throw err;
    }
    data.Resources.KeyVault.forEach(function (kv: any) {
        if(kv.Secrets && kv.Secrets.length > 0) {
        kv.Secrets.forEach(function(sec:any){
            if(sec.Value) {
            const secret = new keyvault.Secret(sec.Name, {
                properties: {
                    value: sec.Value.indexOf("${") > 0 ? resourceOutput.get(sec.Value) : sec.Value,
                },
                resourceGroupName: resourceGroup.name,
                secretName: sec.Name,
                vaultName: `${kv.Name}`,
            });
            }
        });
    }
    });
    
    data.Resources.WebApp.forEach(function (webapp: WebApp) {
        const app = new appservice.WebApp(webapp.Name, {
            resourceGroupName: resourceGroup.name,
            serverFarmId: resourceOutput.get(webapp.AppServicePlanId),
        });
    });
  });

// Create an Azure resource (Storage Account)
const storageAccount = new storage.StorageAccount("sa", {
    resourceGroupName: resourceGroup.name,
    sku: {
        name: storage.SkuName.Standard_LRS,
    },
    kind: storage.Kind.StorageV2,
});

// Export the primary key of the Storage Account
const storageAccountKeys = storage.listStorageAccountKeysOutput({
    resourceGroupName: resourceGroup.name,
    accountName: storageAccount.name
});

const appServicePlan = new appservice.AppServicePlan("appServicePlan", {
    kind: "app",
    name: "apsvcplndcd1claritypoc0101",
    resourceGroupName: resourceGroup.name,
    sku: {
        capacity: 1,
        family: "P",
        name: "P1",
        size: "P1",
        tier: "Premium",
    },
});

const app = new appservice.WebApp("appndcd1claritypoc0101", {
    resourceGroupName: resourceGroup.name,
    serverFarmId: appServicePlan.id,
});


const appBala = new appservice.WebApp("appbalaclaritypoc0101", {
    resourceGroupName: resourceGroup.name,
    serverFarmId: appServicePlan.id,
});

export const primaryStorageKey = storageAccountKeys.keys[0].value;
(async()=>{
console.log(await GetValue(storageAccountKeys.keys[0].value));
pulumi.Output.create(primaryStorageKey);
});