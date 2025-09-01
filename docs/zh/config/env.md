# 环境变量

Kite 默认支持一些环境变量，来改变一些配置项的默认值。

- **KITE_USERNAME**：设置初始管理员用户名。可通过初始化页面中创建
- **KITE_PASSWORD**：设置初始管理员密码。可通过初始化页面中创建
- **KUBECONFIG**：Kubernetes 配置文件路径, 默认值为 `~/.kube/config`，当 kite 没有配置集群时默认从此路径发现并导入集群到 Kite。可通过初始化页面中导入集群
- **ANONYMOUS_USER_ENABLED**：启用匿名用户访问，默认值为 `false`，当启用后所有访问将不再需要身份验证，并且默认拥有最高权限。

- **JWT_SECRET**：用于签名和验证 JWT 的密钥
- **KITE_ENCRYPT_KEY**：用于加密敏感数据的密钥, 例如用户密码，OAuth 的 clientSecret ，kubeconfig 等。

- **HOST**: 用户 OAuth 2.0 授权回调地址生成，默认会从请求头获取，如果您发现结果不及预期可以手动配置此环境变量。

- **NODE_TERMINAL_IMAGE**: 用于生成 Node Terminal Agent 的 Docker 镜像。

- **ENABLE_ANALYTICS**：启用数据分析功能，默认值为 `false`。当启用后，Kite 将收集有限数据以帮助改进产品。

- **PORT**：Kite 运行的端口，默认值为 `8080`。
