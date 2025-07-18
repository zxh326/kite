import { ObjectMeta } from 'kubernetes-types/meta/v1'

export interface Gateway {
  /** APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources */
  apiVersion?: 'gateway.networking.k8s.io/v1'
  /** Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: 'Gateway'
  /** Standard object's metadata. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata */
  metadata?: ObjectMeta
  /** spec is the desired state of the Ingress. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#spec-and-status */
  spec?: GatewaySpec
}

export interface GatewaySpec {
  /** gatewayClassName is the name of the GatewayClass that this Gateway is using. This field is immutable. */
  gatewayClassName?: string
}

export interface HTTPRoute {
  /** APIVersion defines the versioned schema of this representation of an object. Servers should convert recognized schemas to the latest internal value, and may reject unrecognized values. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#resources */
  apiVersion?: 'gateway.networking.k8s.io/v1'
  /** Kind is a string value representing the REST resource this object represents. Servers may infer this from the endpoint the client submits requests to. Cannot be updated. In CamelCase. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#types-kinds */
  kind?: 'HTTPRoute'
  /** Standard object's metadata. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#metadata */
  metadata?: ObjectMeta
  /** spec is the desired state of the HTTPRoute. More info: https://git.k8s.io/community/contributors/devel/sig-architecture/api-conventions.md#spec-and-status */
  spec?: HTTPRouteSpec
}

export interface HTTPRouteSpec {
  /** hostnames is a list of hostnames that this HTTPRoute matches. If empty, the HTTPRoute matches all hostnames. */
  hostnames?: string[]
  /** parentRefs is a list of references to Gateways that this HTTPRoute is attached to. */
  parentRefs?: {
    /** name is the name of the Gateway that this HTTPRoute is attached to. */
    name: string
    /** namespace is the namespace of the Gateway that this HTTPRoute is attached to. If not specified, the Gateway is assumed to be in the same namespace as the HTTPRoute. */
    namespace?: string
    /** sectionName is the name of the section within the Gateway that this HTTPRoute is attached to. If not specified, the HTTPRoute is attached to the default section of the Gateway. */
    sectionName?: string
  }[]
}
