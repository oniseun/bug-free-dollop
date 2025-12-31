# Refactor Notes: Eequ Recruit Backend

This document outlines the key architectural changes and design decisions implemented to align the `eequ-recruit` codebase with the standards observed in `fliq-backend`.

## 1. Architecture & Modularization

- **Feature-Based Modules**: Restructured the application into distinct modules (`AuthModule`, `UsersModule`, `ProductsModule`, `CommonModule`) to encapsulate related logic and dependencies. Each module follows a consistent structure with `controllers/`, `services/`, `repositories/`, `dtos/`, `entities/`, and `tests/` directories.

- **Service-Repository Pattern**: Separated business logic (Services) from data access (Repositories), improving testability and separation of concerns. Repositories handle all TypeORM QueryBuilder operations, while services contain validation, authorization, and business rules.

- **Common Module**: Centralized shared utilities, DTOs (`PageDto`, `PaginationDto`), response formats (`ResponseFormat`), and utility functions (e.g., `email-mask.util.ts`) to reduce duplication across modules.

- **Environment Configuration**: Implemented `ConfigModule` for strict environment variable validation and access throughout the app, ensuring type-safe configuration management.

## 2. Authentication & Authorization

- **JWT Authentication**: Implemented a robust JWT-based auth system using `Passport` and `JwtStrategy`, completely replacing placeholder logic. JWT tokens include `sub` (user ID) and `role` in the payload, with a 15-minute expiration.

- **RBAC & Guards**: Created `JwtAuthGuard` (set as global `APP_GUARD`) and `@Roles()` decorator to enforce role-based access control (Admin vs. User) at the route level. The guard respects `@Public()` decorator for unauthenticated endpoints.

- **Granular Ownership Checks**: Implemented logic in services to prevent users from deleting/updating resources they don't own (unless Admin). Products can only be modified by their owner or an admin; users can only update themselves unless they're an admin.

- **Public vs. Private Routes**: Introduced `@Public()` decorator to explicitly allow unauthenticated access to specific endpoints (e.g., product listing, product details) while keeping the default deny-all policy. The guard allows `currentUser` to be `null` or `undefined` for public routes.

- **CurrentUser Decorator**: Created `@CurrentUser()` to safely extract user context from requests, simplifying controller signatures. The `CurrentUser` interface is centralized in the `auth` module for reuse across the application.

- **Self-Deletion Prevention**: Implemented business logic to prevent users from deleting their own accounts, returning a `400 Bad Request` with a clear error message.

## 3. Data Integrity & Database

- **TypeORM & Migrations**: Configured TypeORM with proper migrations support and `SnakeNamingStrategy` for consistent database naming. Created a migration (`ChangeUserRoleToEnum1767140000000`) to convert `UserRole` to a strict database ENUM type, ensuring data integrity at the database level.

- **Seeding Strategy**: Developed an idempotent seeder (`npm run seed:prod`) that intelligently checks for existing data before running, ensuring a consistent initial state without overwriting existing records. Seeder uses `data.json` with 5 users (1 admin, 4 regular) and 10 products, all with `@eequ.org` email addresses and "password" as the password.

- **Cascade Operations**: Enabled `cascade: true` and `onDelete: 'CASCADE'` on relationships to automatically clean up orphaned products when a user is deleted, maintaining referential integrity.

- **Strict Entities**: Enforced `unique` constraints on emails and proper column types (e.g., `type: 'text'` for descriptions) to maintain data consistency at the DB level. Added proper indexes and foreign key relationships.

- **Migration Execution**: Configured migrations to run only when explicitly called via `npm run migration:run` in the Docker entrypoint, not automatically on app start, giving developers control over when schema changes are applied.

## 4. API Standardization & Documentation

- **Standardized Responses**: Wrapped all API responses in a generic `ResponseFormat<T>` object with `success`, `message`, and `data` properties to ensure consistent success/error payloads for frontend consumption.

- **DTO Validation**: Implemented strict input validation using `class-validator` decorators (`@IsNotEmpty()`, `@IsEmail()`, `@MaxLength()`, `@MinLength()`, etc.) on all request DTOs. Made `firstName` and `lastName` required for user creation, and all product fields required for product creation.

- **Swagger Documentation**: Fully integrated Swagger with `@ApiBearerAuth()` for JWT authorization, detailed DTO schemas using `@ApiProperty()`, and comprehensive `@ApiOperation()`, `@ApiResponse()`, and `@ApiQuery()` annotations, making the API self-documenting and testable via the UI.

- **Pagination**: Standardized listing endpoints with `PaginationDto` (limit, offset, search) for query parameters and `PageDto<T>` responses with `items`, `total`, `limit`, and `offset` properties.

- **Update DTOs**: Used `PartialType()` from `@nestjs/mapped-types` for update DTOs, allowing partial updates while maintaining validation rules. Removed `userId` from update DTOs, deriving it from `currentUser` instead.

## 5. Caching Strategy

- **In-Memory Caching**: Implemented `@nestjs/cache-manager` with in-memory caching (60-second TTL, max 100 items) for frequently accessed single objects. Cache keys follow the pattern `product_{id}` and `user_{id}`.

- **Cache Invalidation**: Cache is invalidated on update and delete operations using `cacheManager.del()`, ensuring data consistency. Cache is checked before database queries in `getProduct()` and `getUser()` methods.

- **Cache-First Pattern**: Services check cache first, falling back to database if cache miss, then storing the result in cache for subsequent requests.

## 6. Security & Privacy

- **Password Hashing**: All passwords are hashed using `bcrypt` with automatic salt generation before storage. Password comparison uses `bcrypt.compare()` during login.

- **Email Masking**: Implemented `maskEmail()` utility function that masks email addresses in user responses (e.g., `j*****@e***.o*g`). Full email is only shown to admins or the user themselves, controlled by an authorization flag in `UserDto.fromEntity()`.

- **Helmet Integration**: Added `helmet` middleware in `main.ts` for HTTP header security, protecting against common vulnerabilities like XSS, clickjacking, and MIME-type sniffing.

- **CORS Configuration**: Configured CORS to allow all origins in development, with proper methods and credentials support.

- **Input Sanitization**: Global `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` ensures only expected properties are accepted, preventing injection attacks.

## 7. Service Layer Patterns

- **CurrentUser Injection**: All service methods that require authorization now accept `currentUser?: CurrentUser` as a parameter, passed from controllers via `@CurrentUser()` decorator. This enables authorization checks at the service level.

- **Ownership Validation**: Services validate ownership before allowing updates/deletes. For products: owner or admin can modify. For users: user can update themselves, admin can update anyone. Ownership checks throw `ForbiddenException` with descriptive messages.

- **Email Uniqueness**: Services check for email uniqueness on both create and update operations, throwing `ConflictException` if email already exists.

- **Error Handling**: Services use structured error handling with specific exception types (`NotFoundException`, `ConflictException`, `ForbiddenException`, `BadRequestException`) wrapped in `ResponseFormat` objects, ensuring consistent error responses.

- **Logging**: Integrated `Logger` from `@nestjs/common` in all services for error logging, warning for not-found scenarios, and info logs for successful operations with user context.

## 8. DTO Design & Validation

- **Request DTOs**: All request DTOs (`CreateUserDto`, `CreateProductDto`, `UpdateUserDto`, `UpdateProductDto`, `LoginDto`) include comprehensive validation decorators and Swagger documentation. Required fields use `@IsNotEmpty()`, strings have `@MaxLength()` constraints, emails use `@IsEmail()`.

- **Response DTOs**: Response DTOs (`UserDto`, `ProductDto`, `LoginResponseDto`) use static `fromEntity()` methods for transformation, applying business logic like email masking. `ProductDto` includes nested `UserDto` for the product owner.

- **Removed userId from DTOs**: `CreateUserDto` and `CreateProductDto` no longer require `userId`; it's derived from `currentUser.userId` in the service layer, preventing users from creating resources for other users.

- **Type Safety**: All DTOs use TypeScript interfaces and enums (`UserRole`) for type safety, with proper imports and exports.

## 9. Testing Strategy

- **E2E Testing**: Recreated E2E tests in `tests/` folders within each module (`products/tests/product.e2e-spec.ts`, `users/tests/user.e2e-spec.ts`, `auth/tests/auth.e2e-spec.ts`) to run against a live containerized database via `docker-compose.test-infra.yml`, verifying real-world behavior including DB constraints, triggers, and relationships.

- **Test Utilities**: Created reusable test utilities in `src/test/` including `TestDatabaseService` for database cleanup, `EntityTestService` for entity creation, `createTestModule()` for test module setup, and module-specific test services (`UserTestService`, `ProductTestService`).

- **Unit Testing**: Refactored unit tests to use `@golevelup/ts-jest`'s `createMock()` and `DeepMocked<T>` for type-safe, deep mocking of dependencies, removing brittle manual mocks. All tests avoid `any` types and use correct TypeScript types.

- **Test Coverage**: Ensured critical paths are covered: authentication flows, CRUD operations, permission checks, ownership validation, caching behavior, and error handling scenarios.

- **Test Organization**: Moved E2E tests from module root to `tests/` subdirectories for better organization, updating import paths accordingly (`../../../test/` for test utilities).

## 10. Infrastructure & Deployment

- **Dockerization**: Updated `Dockerfile` to use Node 22 and multi-stage builds for optimized production images. Configured `docker-compose.yml` for full stack (App + MySQL + Redis) with proper networking and volume management.

- **Entrypoint Script**: Created `docker-entrypoint.sh` to handle migration execution (`npm run migration:run`) and conditional seeding (`npm run seed:prod`) automatically upon container startup, ensuring database is properly initialized.

- **Local Development**: Added `localDataSource.ts` for CLI operations (migrations, seeding) without needing to run the full application, using the same configuration as the main app but with direct DataSource access.

- **Production Scripts**: Updated `package.json` to use `start:prod` for production builds, running compiled JavaScript from `dist/` directory.

- **Test Infrastructure**: Created `docker-compose.test-infra.yml` for isolated test database and Redis instances, ensuring tests don't interfere with development or production databases.

## 11. Error Handling & Logging

- **Structured Error Responses**: All errors are wrapped in `ResponseFormat` objects with consistent structure (`success: false`, `message: string`). HTTP status codes are mapped appropriately (404 for not found, 403 for forbidden, 400 for bad request, 401 for unauthorized, 409 for conflicts).

- **Logger Integration**: Integrated `nestjs-pino` LoggerModule globally and individual `Logger` instances in services for structured logging. Logs include context (service name, user ID, operation type) and error stacks for debugging.

- **Exception Filtering**: Services catch and re-throw specific exceptions (`NotFoundException`, `ConflictException`, etc.) to maintain proper HTTP status codes, while logging unexpected errors for monitoring.

## 12. Code Organization & Best Practices

- **Consistent File Structure**: Each module follows the same directory structure: `controllers/`, `services/`, `repositories/`, `dtos/request/`, `dtos/response/`, `entities/`, `enums/`, `tests/`, and `*.module.ts`.

- **Import Organization**: Imports are organized by source (NestJS, third-party, local) with clear separation. Relative imports use consistent patterns based on file location.


- **Documentation**: Added comprehensive JSDoc comments where needed and Swagger decorators for API documentation. Code is self-documenting through clear naming conventions.

- **Separation of Concerns**: Controllers handle HTTP concerns (request/response), services handle business logic, repositories handle data access, and DTOs handle validation and transformation.
