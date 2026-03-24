# 文件发现策略

## 第一步：定位项目类型（通过特征文件）

```javascript
// 检测逻辑（伪代码）
const detectors = {
  // React 前端
  react: {
    files: ['package.json'],
    contentCheck: (content) => {
      const pkg = JSON.parse(content);
      return pkg.dependencies?.react || pkg.devDependencies?.react;
    },
    sourceDirs: ['src/', 'app/', 'pages/']
  },

  // Vue 前端
  vue: {
    files: ['package.json', 'vue.config.js', 'vite.config.ts'],
    contentCheck: (content) => content.includes('vue'),
    sourceDirs: ['src/', 'views/', 'components/']
  },

  // Next.js
  nextjs: {
    files: ['next.config.js', 'next.config.mjs'],
    contentCheck: () => true, // 文件存在即为 Next.js
    sourceDirs: ['app/', 'pages/', 'src/app/', 'src/pages/']
  },

  // Node 后端
  nodeBackend: {
    files: ['package.json'],
    contentCheck: (content) => {
      const pkg = JSON.parse(content);
      // 有 express/fastify/nest 但无 react/vue
      return (pkg.dependencies?.express ||
              pkg.dependencies?.fastify ||
              pkg.dependencies?.['@nestjs/core']) &&
             !pkg.dependencies?.react &&
             !pkg.dependencies?.vue;
    },
    sourceDirs: ['src/', 'routes/', 'controllers/', 'api/']
  },

  // Python Django
  django: {
    files: ['manage.py', 'requirements.txt', 'pyproject.toml'],
    contentCheck: (content) => content.includes('django'),
    sourceDirs: ['', 'apps/'] // Django 通常在根目录
  },

  // Python Flask/FastAPI
  pythonApi: {
    files: ['requirements.txt', 'pyproject.toml', 'Pipfile'],
    contentCheck: (content) =>
      content.includes('flask') || content.includes('fastapi'),
    sourceDirs: ['', 'app/', 'src/']
  },

  // Java Spring Boot
  springBoot: {
    files: ['pom.xml', 'build.gradle'],
    contentCheck: (content) =>
      content.includes('spring-boot') || content.includes('spring-boot-starter'),
    sourceDirs: ['src/main/java/', 'src/main/resources/']
  },

  // Go
  goProject: {
    files: ['go.mod', 'go.sum'],
    contentCheck: () => true,
    sourceDirs: ['', 'cmd/', 'pkg/', 'internal/']
  },

  // Rust
  rust: {
    files: ['Cargo.toml', 'Cargo.lock'],
    contentCheck: () => true,
    sourceDirs: ['src/']
  },

  // Docker 项目
  docker: {
    files: ['Dockerfile', 'docker-compose.yml', 'compose.yaml'],
    contentCheck: () => true,
    sourceDirs: ['']
  }
};
```

## 第二步：根据项目类型获取源文件

```javascript
// 文件匹配模式（按项目类型）
const filePatterns = {
  react: {
    pages: ['**/pages/**/*.{jsx,tsx}', '**/app/**/page.{jsx,tsx}'],
    components: ['**/components/**/*.{jsx,tsx,vue}'],
    apis: ['**/api/**/*.{js,ts}', '**/services/**/*.{js,ts}'],
    types: ['**/*.types.{ts,js}', '**/types/**/*.{ts,js}'],
    utils: ['**/utils/**/*.{js,ts}', '**/lib/**/*.{js,ts}'],
    hooks: ['**/hooks/**/*.{js,ts}'],
    stores: ['**/store/**/*.{js,ts}', '**/stores/**/*.{js,ts}']
  },

  vue: {
    pages: ['**/views/**/*.{vue,js,ts}', '**/pages/**/*.{vue,js,ts}'],
    components: ['**/components/**/*.{vue,js,ts}'],
    apis: ['**/api/**/*.{js,ts}', '**/services/**/*.{js,ts}'],
    composables: ['**/composables/**/*.{js,ts}'],
    stores: ['**/store/**/*.{js,ts}']
  },

  nextjs: {
    pages: ['app/**/page.{tsx,jsx}', 'pages/**/*.{tsx,jsx}'],
    layouts: ['app/**/layout.{tsx,jsx}'],
    apis: ['app/**/route.{ts,js}', 'pages/api/**/*.{ts,js}'],
    components: ['components/**/*.{tsx,jsx,vue}'],
    lib: ['lib/**/*.{ts,js}']
  },

  nodeBackend: {
    routes: ['**/routes/**/*.{js,ts}', '**/routers/**/*.{js,ts}'],
    controllers: ['**/controllers/**/*.{js,ts}'],
    services: ['**/services/**/*.{js,ts}'],
    models: ['**/models/**/*.{js,ts}', '**/entities/**/*.{js,ts}'],
    middleware: ['**/middleware/**/*.{js,ts}'],
    config: ['**/config/**/*.{js,ts}']
  },

  django: {
    apps: ['**/apps.py'], // Django 应用入口
    models: ['**/models.py', '**/models/**/*.py'],
    views: ['**/views.py', '**/views/**/*.py'],
    serializers: ['**/serializers.py', '**/serializers/**/*.py'],
    urls: ['**/urls.py'],
    admin: ['**/admin.py']
  },

  pythonApi: {
    routes: ['**/routers/**/*.py', '**/routes/**/*.py'],
    models: ['**/models/**/*.py'],
    schemas: ['**/schemas/**/*.py'],
    services: ['**/services/**/*.py'],
    dependencies: ['**/dependencies/**/*.py']
  },

  springBoot: {
    controllers: ['**/*Controller.java', '**/*Controller.kt'],
    services: ['**/*Service.java', '**/*Service.kt', '**/*ServiceImpl.java'],
    repositories: ['**/*Repository.java', '**/*Repository.kt'],
    entities: ['**/*Entity.java', '**/*Entity.kt', '**/entity/**/*.java'],
    configs: ['**/config/**/*.java', '**/configuration/**/*.java'],
    dtos: ['**/*Dto.java', '**/*DTO.java', '**/dto/**/*.java']
  },

  go: {
    handlers: ['**/handler*.go', '**/*_handler.go', '**/handlers/**/*.go'],
    services: ['**/service*.go', '**/*_service.go', '**/services/**/*.go'],
    models: ['**/model*.go', '**/*_model.go', '**/models/**/*.go'],
    repositories: ['**/repository*.go', '**/*_repo.go', '**/repositories/**/*.go'],
    routes: ['**/router*.go', '**/routes*.go', '**/route*.go'],
    middleware: ['**/middleware*.go', '**/*_middleware.go']
  }
};
```

## 第三步：生成文件清单（Manifest）

```javascript
// manifest.json 结构示例
{
  "projectType": "react",
  "detectedAt": "2024-01-15T10:30:00Z",
  "totalFiles": 156,
  "modules": [
    {
      "name": "用户管理",
      "type": "business-module",
      "entryPoint": "src/pages/User/index.tsx",
      "files": {
        "page": "src/pages/User/index.tsx",
        "components": [
          "src/components/User/UserList.tsx",
          "src/components/User/UserForm.tsx"
        ],
        "api": "src/api/user.ts",
        "types": "src/types/user.ts",
        "store": "src/store/userSlice.ts"
      },
      "status": "pending" // pending | analyzing | documented
    }
  ],
  "orphanFiles": [ // 未归类的文件
    "src/utils/date.ts",
    "src/hooks/useAuth.ts"
  ],
  "progress": {
    "totalModules": 12,
    "completed": 0,
    "inProgress": 0,
    "pending": 12
  }
}
```

## 第四步：执行流程

```bash
# 1. 检测项目类型
读取 package.json / pom.xml / go.mod 等

# 2. 匹配文件模式
根据项目类型，执行对应的 Glob 模式

# 3. 生成分组
- 读取路由配置，按路由分组
- 或按目录结构分组
- 或按 import 关系分组

# 4. 输出清单
写入 .wiki-generator/manifest.json
```

## 关键原则

1. **不猜**：通过特征文件确定项目类型，不是推测
2. **穷尽**：每个匹配模式都要执行，不能抽样
3. **验证**：生成清单后立即验证文件存在
4. **去重**：同文件可能在多个模式中出现，需要去重
5. **可追踪**：每个文件必须有状态（pending/documented）
