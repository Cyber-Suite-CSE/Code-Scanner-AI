import { Framework, FrameworkConfig } from "./types";

/**
 * Base configuration shared across all frameworks
 */
const BASE_CONFIG: FrameworkConfig = {
  extensions: new Set([
    // Documentation
    ".md", ".mdx", ".txt", ".rst",
    // Config files
    ".json", ".yaml", ".yml", ".toml", ".xml",
    ".env", ".env.example", ".env.local",
    // Shell scripts
    ".sh", ".bash",
    // Docker
    ".dockerfile",
    // SQL
    ".sql",
    // GraphQL
    ".graphql", ".gql",
  ]),
  specialFiles: [
    "dockerfile",
    "makefile",
    ".gitignore",
    ".dockerignore",
    ".editorconfig",
    ".nvmrc",
    ".node-version",
    ".python-version",
    "procfile",
  ],
  ignoreDirs: [
    "node_modules",
    ".git",
    ".svn",
    ".hg",
    ".idea",
    ".vscode",
    ".vs",
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    ".tox",
    ".nox",
    ".venv",
    "venv",
    "env",
    ".env",
    "virtualenv",
    "dist",
    "build",
    "out",
    "target",
    ".next",
    ".nuxt",
    ".output",
    "coverage",
    ".nyc_output",
    "logs",
    "tmp",
    "temp",
    ".tmp",
    ".temp",
    ".cache",
    ".gradle",
    ".m2",
    "bin",
    "obj",
  ],
  ignoreFiles: [
    // Lock files
    "package-lock.json",
    "pnpm-lock.yaml",
    "yarn.lock",
    "poetry.lock",
    "pipfile.lock",
    "composer.lock",
    "gemfile.lock",
    "cargo.lock",
    // Minified files
    "*.min.js",
    "*.min.css",
    "*.bundle.js",
    "*.chunk.js",
    // Source maps
    "*.map",
    "*.js.map",
    "*.css.map",
    // System files
    ".ds_store",
    "thumbs.db",
    "desktop.ini",
    // IDE files
    "*.iml",
    ".project",
    ".classpath",
    // Compiled files
    "*.pyc",
    "*.pyo",
    "*.class",
    "*.o",
    "*.obj",
    "*.dll",
    "*.exe",
    "*.so",
    "*.dylib",
  ],
  importantFiles: [],
};

/**
 * Express.js specific configuration
 */
const EXPRESS_CONFIG: FrameworkConfig = {
  extensions: new Set([
    ...BASE_CONFIG.extensions,
    ".js", ".mjs", ".cjs",
    ".ts", ".mts", ".cts",
    ".jsx", ".tsx",
    ".html", ".htm",
    ".css", ".scss", ".sass", ".less",
    ".ejs", ".pug", ".hbs", ".handlebars",
    ".prisma",
  ]),
  specialFiles: [...BASE_CONFIG.specialFiles],
  ignoreDirs: [...BASE_CONFIG.ignoreDirs, "public/uploads", "uploads"],
  ignoreFiles: [...BASE_CONFIG.ignoreFiles],
  importantFiles: [
    "package.json",
    "app.js",
    "app.ts",
    "server.js",
    "server.ts",
    "index.js",
    "index.ts",
    "tsconfig.json",
    ".eslintrc",
    ".eslintrc.js",
    ".eslintrc.json",
  ],
};

/**
 * Fastify specific configuration
 */
const FASTIFY_CONFIG: FrameworkConfig = {
  extensions: new Set([
    ...BASE_CONFIG.extensions,
    ".js", ".mjs", ".cjs",
    ".ts", ".mts", ".cts",
    ".jsx", ".tsx",
    ".html", ".htm",
    ".css", ".scss", ".sass", ".less",
    ".prisma",
  ]),
  specialFiles: [...BASE_CONFIG.specialFiles],
  ignoreDirs: [...BASE_CONFIG.ignoreDirs],
  ignoreFiles: [...BASE_CONFIG.ignoreFiles],
  importantFiles: [
    "package.json",
    "app.js",
    "app.ts",
    "server.js",
    "server.ts",
    "index.js",
    "index.ts",
    "tsconfig.json",
    "fastify.config.js",
  ],
};

/**
 * NestJS specific configuration
 */
const NESTJS_CONFIG: FrameworkConfig = {
  extensions: new Set([
    ...BASE_CONFIG.extensions,
    ".ts", ".mts", ".cts",
    ".js", ".mjs", ".cjs",
    ".html", ".htm",
    ".css", ".scss", ".sass", ".less",
    ".prisma",
  ]),
  specialFiles: [...BASE_CONFIG.specialFiles],
  ignoreDirs: [...BASE_CONFIG.ignoreDirs],
  ignoreFiles: [...BASE_CONFIG.ignoreFiles],
  importantFiles: [
    "package.json",
    "nest-cli.json",
    "tsconfig.json",
    "tsconfig.build.json",
    "main.ts",
    "app.module.ts",
  ],
};

/**
 * Spring Boot specific configuration
 */
const SPRINGBOOT_CONFIG: FrameworkConfig = {
  extensions: new Set([
    ...BASE_CONFIG.extensions,
    ".java",
    ".kt", ".kts",
    ".scala",
    ".groovy",
    ".properties",
    ".html", ".htm",
    ".css", ".scss",
    ".js", ".ts",
    ".ftl", ".ftlh",
    ".thymeleaf",
  ]),
  specialFiles: [
    ...BASE_CONFIG.specialFiles,
    "gradlew",
    "mvnw",
  ],
  ignoreDirs: [
    ...BASE_CONFIG.ignoreDirs,
    ".gradle",
    ".m2",
    "target",
    "build",
    ".mvn/wrapper",
    ".gradle/wrapper",
  ],
  ignoreFiles: [
    ...BASE_CONFIG.ignoreFiles,
    "gradlew.bat",
    "mvnw.cmd",
    "*.jar",
    "*.war",
  ],
  importantFiles: [
    "pom.xml",
    "build.gradle",
    "build.gradle.kts",
    "settings.gradle",
    "settings.gradle.kts",
    "application.properties",
    "application.yml",
    "application.yaml",
    "application-*.properties",
    "application-*.yml",
  ],
};

/**
 * Flask specific configuration
 */
const FLASK_CONFIG: FrameworkConfig = {
  extensions: new Set([
    ...BASE_CONFIG.extensions,
    ".py", ".pyw", ".pyi",
    ".html", ".htm",
    ".css", ".scss", ".sass", ".less",
    ".js", ".ts",
    ".jinja", ".jinja2", ".j2",
    ".cfg", ".ini",
  ]),
  specialFiles: [
    ...BASE_CONFIG.specialFiles,
    "requirements.txt",
    "setup.py",
    "setup.cfg",
    "pyproject.toml",
    "pipfile",
    "wsgi.py",
    "asgi.py",
  ],
  ignoreDirs: [
    ...BASE_CONFIG.ignoreDirs,
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    "*.egg-info",
    ".eggs",
    "instance",
  ],
  ignoreFiles: [
    ...BASE_CONFIG.ignoreFiles,
    "*.pyc",
    "*.pyo",
    "*.pyd",
    "*.egg",
  ],
  importantFiles: [
    "app.py",
    "application.py",
    "wsgi.py",
    "config.py",
    "requirements.txt",
    "pyproject.toml",
    "setup.py",
  ],
};

/**
 * Django specific configuration
 */
const DJANGO_CONFIG: FrameworkConfig = {
  extensions: new Set([
    ...BASE_CONFIG.extensions,
    ".py", ".pyw", ".pyi",
    ".html", ".htm",
    ".css", ".scss", ".sass", ".less",
    ".js", ".ts",
    ".jinja", ".jinja2", ".j2",
    ".cfg", ".ini",
  ]),
  specialFiles: [
    ...BASE_CONFIG.specialFiles,
    "requirements.txt",
    "setup.py",
    "setup.cfg",
    "pyproject.toml",
    "pipfile",
    "manage.py",
    "wsgi.py",
    "asgi.py",
  ],
  ignoreDirs: [
    ...BASE_CONFIG.ignoreDirs,
    "__pycache__",
    ".pytest_cache",
    ".mypy_cache",
    "*.egg-info",
    ".eggs",
    "staticfiles",
    "media",
    "migrations",
  ],
  ignoreFiles: [
    ...BASE_CONFIG.ignoreFiles,
    "*.pyc",
    "*.pyo",
    "*.pyd",
    "*.egg",
    "*.sqlite3",
    "db.sqlite3",
  ],
  importantFiles: [
    "manage.py",
    "settings.py",
    "urls.py",
    "wsgi.py",
    "asgi.py",
    "requirements.txt",
    "pyproject.toml",
  ],
};

/**
 * Next.js specific configuration
 */
const NEXTJS_CONFIG: FrameworkConfig = {
  extensions: new Set([
    ...BASE_CONFIG.extensions,
    ".js", ".mjs", ".cjs",
    ".ts", ".mts", ".cts",
    ".jsx", ".tsx",
    ".html", ".htm",
    ".css", ".scss", ".sass", ".less",
    ".module.css", ".module.scss",
    ".prisma",
    ".vue", ".svelte", ".astro",
  ]),
  specialFiles: [...BASE_CONFIG.specialFiles],
  ignoreDirs: [
    ...BASE_CONFIG.ignoreDirs,
    ".next",
    ".vercel",
    ".turbo",
    "public",
  ],
  ignoreFiles: [...BASE_CONFIG.ignoreFiles],
  importantFiles: [
    "package.json",
    "next.config.js",
    "next.config.mjs",
    "next.config.ts",
    "tsconfig.json",
    "tailwind.config.js",
    "tailwind.config.ts",
    "postcss.config.js",
    "postcss.config.mjs",
  ],
};

/**
 * Unknown/Generic framework configuration
 */
const UNKNOWN_CONFIG: FrameworkConfig = {
  extensions: new Set([
    ...BASE_CONFIG.extensions,
    // JavaScript/TypeScript
    ".js", ".jsx", ".ts", ".tsx", ".mjs", ".cjs",
    // Python
    ".py", ".pyw",
    // Java/JVM
    ".java", ".kt", ".scala", ".groovy",
    // C/C++
    ".c", ".cpp", ".cc", ".h", ".hpp",
    // C#
    ".cs",
    // Go
    ".go",
    // Rust
    ".rs",
    // Ruby
    ".rb",
    // PHP
    ".php",
    // Swift
    ".swift",
    // Web
    ".html", ".htm", ".css", ".scss", ".sass", ".less",
    ".vue", ".svelte", ".astro",
    // Templates
    ".ejs", ".pug", ".hbs", ".jinja", ".jinja2",
    // Prisma/DB
    ".prisma",
    // Terraform
    ".tf", ".tfvars",
  ]),
  specialFiles: [...BASE_CONFIG.specialFiles],
  ignoreDirs: [...BASE_CONFIG.ignoreDirs],
  ignoreFiles: [...BASE_CONFIG.ignoreFiles],
  importantFiles: [],
};

/**
 * Map of frameworks to their configurations
 */
export const FRAMEWORK_CONFIGS: Record<Framework, FrameworkConfig> = {
  express: EXPRESS_CONFIG,
  fastify: FASTIFY_CONFIG,
  nestjs: NESTJS_CONFIG,
  springboot: SPRINGBOOT_CONFIG,
  flask: FLASK_CONFIG,
  django: DJANGO_CONFIG,
  nextjs: NEXTJS_CONFIG,
  unknown: UNKNOWN_CONFIG,
};

/**
 * Get the configuration for a specific framework
 */
export function getFrameworkConfig(framework: Framework): FrameworkConfig {
  return FRAMEWORK_CONFIGS[framework] || UNKNOWN_CONFIG;
}
