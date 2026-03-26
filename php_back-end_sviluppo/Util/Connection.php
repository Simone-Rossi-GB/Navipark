<?php

namespace Util;

use PDO;
use PDOException;

class Connection
{
    private static ?PDO $istance = null;
    private static array $config = [
        'dsn' => 'pgsql:host=lamp_pg_db;port=5432;dbname=postgres',
        'username' => 'root',
        'password' => 'password'
    ];

    private function __construct()
    {
        // vuoto per non permettere la creazione di oggetti
    }

    public static function getInstance(): PDO
    {
        if (!isset(self::$istance)) {
            try {
                self::$istance = new PDO(
                    self::$config['dsn'],
                    self::$config['username'],
                    self::$config['password']
                );
                self::$istance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
            } catch (PDOException $e) {
                // Handle connection error
                throw new RuntimeException("[Connection.php] Database connection failed: " . $e->getMessage());
            }
        }
        return self::$istance;
    }
}