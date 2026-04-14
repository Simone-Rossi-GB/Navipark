<?php
return [
    'DB_DSN'     => 'pgsql:host=lamp_pg_db;port=5432;dbname=postgres',
    'DB_USER'    => 'root',
    'DB_PWD'    => 'password',
    'BASEPATH'   => '/v1',
    'JWT_SECRET' => '5ba298f2fd2bba364372ce93a789edd79f90251ddd136dc12bf8fae6948aa6b9',
    'JWT_TTL'    => 86400, // in secondi —> 86400 = 24 ore
    'LOKI_URL' => 'http://host.docker.internal:3100',
    'APP_NAME' => 'Navipark',
];