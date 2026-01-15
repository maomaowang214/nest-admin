const { execSync } = require('node:child_process')
const fs = require('node:fs')
const path = require('node:path')

// 读取 package.json 获取版本号
const packageJsonPath = path.join(__dirname, '../package.json')
const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf8'))
const version = packageJson.version || '1.0.0'

// 将版本号中的点替换为下划线
const migrationName = `update-table_${version.replace(/\./g, '_')}`

// 执行 TypeORM migration:generate 命令
// 注意：migration:generate 会比较实体定义和数据库当前状态
// 如果 DB_SYNCHRONIZE=true，数据库结构可能已经自动同步，但迁移表中没有记录
// 这会导致生成重复的迁移文件
const migrationPath = `./src/migrations/${migrationName}`
const command = `npm run typeorm migration:generate ${migrationPath}`

console.log(`正在生成迁移文件: ${migrationName}`)
console.log(`提示：如果生成的迁移文件包含已存在的列或约束，请检查：`)
console.log(`1. DB_SYNCHRONIZE 是否设置为 true（应该为 false）`)
console.log(`2. 迁移记录表是否与数据库实际状态一致`)
console.log(`3. 是否手动修改过数据库结构但未记录到迁移表`)
console.log(``)

try {
  execSync(command, { stdio: 'inherit', cwd: path.join(__dirname, '..') })
  console.log(`迁移文件生成成功: ${migrationPath}`)
  console.log(`请检查生成的迁移文件，确保不会重复创建已存在的列或约束`)
}
catch (error) {
  console.error('生成迁移文件失败:', error.message)
  process.exit(1)
}
