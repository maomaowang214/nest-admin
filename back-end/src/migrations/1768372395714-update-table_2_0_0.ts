import type { MigrationInterface, QueryRunner } from 'typeorm'

export class UpdateTable2001768372395714 implements MigrationInterface {
  name = 'UpdateTable2001768372395714'

  public async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`user_refresh_tokens\` DROP FOREIGN KEY \`FK_1dfd080c2abf42198691b60ae39\``)
    await queryRunner.query(`ALTER TABLE \`user_refresh_tokens\` CHANGE \`accessTokenId\` \`accessTokenId\` varchar(19) NULL COMMENT '主键ID（雪花ID）'`)
    await queryRunner.query(`ALTER TABLE \`user_access_tokens\` DROP FOREIGN KEY \`FK_e9d9d0c303432e4e5e48c1c3e90\``)
    await queryRunner.query(`ALTER TABLE \`user_access_tokens\` CHANGE \`user_id\` \`user_id\` varchar(19) NULL COMMENT '主键ID（雪花ID）'`)
    await queryRunner.query(`ALTER TABLE \`todo\` DROP FOREIGN KEY \`FK_9cb7989853c4cb7fe427db4b260\``)
    await queryRunner.query(`ALTER TABLE \`todo\` CHANGE \`user_id\` \`user_id\` varchar(19) NULL COMMENT '主键ID（雪花ID）'`)
    await queryRunner.query(`ALTER TABLE \`user_refresh_tokens\` ADD CONSTRAINT \`FK_1dfd080c2abf42198691b60ae39\` FOREIGN KEY (\`accessTokenId\`) REFERENCES \`user_access_tokens\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE \`user_access_tokens\` ADD CONSTRAINT \`FK_e9d9d0c303432e4e5e48c1c3e90\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE \`todo\` ADD CONSTRAINT \`FK_9cb7989853c4cb7fe427db4b260\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`)
  }

  public async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query(`ALTER TABLE \`todo\` DROP FOREIGN KEY \`FK_9cb7989853c4cb7fe427db4b260\``)
    await queryRunner.query(`ALTER TABLE \`user_access_tokens\` DROP FOREIGN KEY \`FK_e9d9d0c303432e4e5e48c1c3e90\``)
    await queryRunner.query(`ALTER TABLE \`user_refresh_tokens\` DROP FOREIGN KEY \`FK_1dfd080c2abf42198691b60ae39\``)
    await queryRunner.query(`ALTER TABLE \`todo\` CHANGE \`user_id\` \`user_id\` varchar(19) COLLATE "utf8mb4_general_ci" NULL`)
    await queryRunner.query(`ALTER TABLE \`todo\` ADD CONSTRAINT \`FK_9cb7989853c4cb7fe427db4b260\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_user\`(\`id\`) ON DELETE NO ACTION ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE \`user_access_tokens\` CHANGE \`user_id\` \`user_id\` varchar(19) COLLATE "utf8mb4_general_ci" NULL`)
    await queryRunner.query(`ALTER TABLE \`user_access_tokens\` ADD CONSTRAINT \`FK_e9d9d0c303432e4e5e48c1c3e90\` FOREIGN KEY (\`user_id\`) REFERENCES \`sys_user\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`)
    await queryRunner.query(`ALTER TABLE \`user_refresh_tokens\` CHANGE \`accessTokenId\` \`accessTokenId\` varchar(19) COLLATE "utf8mb4_general_ci" NULL`)
    await queryRunner.query(`ALTER TABLE \`user_refresh_tokens\` ADD CONSTRAINT \`FK_1dfd080c2abf42198691b60ae39\` FOREIGN KEY (\`accessTokenId\`) REFERENCES \`user_access_tokens\`(\`id\`) ON DELETE CASCADE ON UPDATE NO ACTION`)
  }
}
