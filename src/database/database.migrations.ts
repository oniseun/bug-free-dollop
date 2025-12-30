import { AddUserTable1743970858520 } from './migrations/1743970858520-AddUserTable';
import { AddProductTable1744403726661 } from './migrations/1744403726661-AddProductTable';
import { AddColumnsToUserTable1744455378587 } from './migrations/1744455378587-AddColumnsToUserTable';
import { AddUserRoleToUserTable1747930420048 } from './migrations/1747930420048-AddUserRoleToUserTable';
import { AddCategoryTable1748370027848 } from './migrations/1748370027848-AddCategoryTable';
import { ChangeUserRoleToEnum1767140000000 } from './migrations/1767140000000-ChangeUserRoleToEnum';

export const DB_MIGRATIONS = [
  AddUserTable1743970858520,
  AddProductTable1744403726661,
  AddColumnsToUserTable1744455378587,
  AddUserRoleToUserTable1747930420048,
  ChangeUserRoleToEnum1767140000000,
];
