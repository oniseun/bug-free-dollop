const { SnakeNamingStrategy } = require('typeorm-naming-strategies');
require('dotenv').config();

module.exports = {
    type: 'mysql',
    host: process.env.DB_HOST,
    port: process.env.DB_PORT,
    username: process.env.DB_USERNAME,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    timezone: 'Z',
    entities: ['dist/**/*.entity.js'],
    logging: false,
    migrations: ['dist/database/migrations/*.js'],
    cli: {
        migrationsDir: 'src/database/migrations',
    },
    namingStrategy: new SnakeNamingStrategy(),
};
