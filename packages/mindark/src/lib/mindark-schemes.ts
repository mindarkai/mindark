// Generated by ts-to-zod
import { z } from 'zod';
import { type ArkPackage } from './mindark-types';

export const EchoConfigScheme = z.object({});

export const ArkRuntimeConfigScheme = z.object({
  urlPrefix: z.string().optional(),
  tmpDir: z.string().optional(),
  logMessages: z.boolean().optional(),
});

export const EchoIdScheme = z.object({
  id: z.string(),
  hash: z.string().optional(),
  url: z.string().optional(),
});

export const ArkControllerInterfaceTypeScheme = z.union([
  z.literal('direct'),
  z.literal('stdio'),
]);

export const ArkMessageTransportTypeScheme = z.union([
  z.literal('http'),
  z.literal('stdio'),
  z.literal('humanChat'),
]);

export const ArkMessageOptionalIdScheme = z.object({
  id: z.string().optional(),
  type: z.string(),
  from: z.string().optional(),
  to: z.string(),
  payload: z.any().optional(),
});

export const ArkMessageScheme = ArkMessageOptionalIdScheme.extend({
  id: z.string(),
});

export const ArkPathPartTypeScheme = z.union([
  z.literal('tag'),
  z.literal('id'),
  z.literal('name'),
]);

export const ArkPathPartScheme = z.object({
  type: ArkPathPartTypeScheme,
  value: z.string(),
});

export const ArkUrlScheme = z.object({
  protocol: z.string(),
  name: z.string(),
  path: z.array(ArkPathPartScheme),
  isRelative: z.boolean(),
  url: z.string(),
});

export const RuntimeDefSourceModeScheme = z.union([
  z.literal('mount'),
  z.literal('copy'),
]);

export const RuntimeDefArchScheme = z.union([
  z.literal('amd64'),
  z.literal('arm64'),
]);

export const RuntimeDefEnvSourceScheme = z.object({
  local: z.string().optional(),
});

export const RuntimeDefPortMappingScheme = z.object({
  i: z.number().optional(),
  o: z.number().optional(),
});

export const RuntimeDefVolumeMappingScheme = z.object({
  src: z.string(),
  mount: z.string(),
});

export const RuntimeOrchestratorEngineScheme = z.union([
  z.literal('podman'),
  z.literal('docker'),
  z.literal('kubernetes'),
]);

const VfsItemScheme = z.any();

export const ArkPackageCtrlRefScheme = z.object({
  type: z.string(),
  controllerPath: z.string().optional(),
  controllerArgs: z.array(z.string()).optional(),
  interfaceType: ArkControllerInterfaceTypeScheme.optional(),
  controllerClass: z.any().optional(),
});

export const ArkMessageDeliveryScheme = z.object({
  to: ArkUrlScheme,
  message: ArkMessageScheme,
  pathIndex: z.number().optional(),
});

export const RuntimeDefConfigScheme = z.object({
  packagePath: z.string(),
  dockerFilePath: z.string().optional(),
  dockerContextPath: z.string().optional(),
  sourceMode: RuntimeDefSourceModeScheme.optional(),
  containerSourcePath: z.string().optional().default('/ark-package'),
  cpuCount: z.number().optional(),
  memoryMb: z.number().optional(),
  network: z.string().optional().default('ark-default'),
  arch: RuntimeDefArchScheme.optional(),
  dockerBuildArgs: z.array(z.string()).optional(),
  dockerRunArgs: z.array(z.string()).optional(),
  env: z.record(z.union([z.string(), RuntimeDefEnvSourceScheme])).optional(),
  ports: z.array(RuntimeDefPortMappingScheme).optional(),
  volumes: z.array(RuntimeDefVolumeMappingScheme).optional(),
});

export const RuntimeOrchestratorConfigScheme = z.object({
  engine: RuntimeOrchestratorEngineScheme.optional(),
  maxConcurrentBuilds: z.number().optional(),
});

export const ArkPackageScheme: z.ZodSchema<ArkPackage> = z.lazy(() =>
  z.object({
    id: z.string(),
    persistentId: z.boolean().optional(),
    type: z.string(),
    name: z.string(),
    isModule: z.boolean(),
    description: z.string().optional(),
    author: z.string().optional(),
    data: z.record(z.any()).optional(),
    path: z.string(),
    vfsItem: VfsItemScheme.optional(),
    children: z.array(ArkPackageScheme).optional(),
    controllers: z.array(ArkPackageCtrlRefScheme).optional(),
    tags: z.array(z.string()).optional(),
  }),
);
