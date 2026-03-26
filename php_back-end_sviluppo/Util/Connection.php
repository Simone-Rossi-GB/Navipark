<?php
namespace Util;

use PDO;
use PDOException;
use RuntimeException;

class Connection
{
    private static ?PDO $instance = null;

    private function __construct() {}

    public static function getInstance(string $dsn = '', string $user = '', string $pass = ''): PDO
    {
        if (self::$instance === null) {
            try {
                self::$instance = new PDO($dsn, $user, $pass);
                self::$instance->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
                self::$instance->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
            } catch (PDOException $e) {
                throw new RuntimeException('Database non raggiungibile: ' . $e->getMessage());
            }
        }
        return self::$instance;
    }
}