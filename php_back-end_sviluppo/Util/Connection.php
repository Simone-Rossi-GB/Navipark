<?php

namespace Util;

use PDO;
use PDOException;

class Connection
{
    private static ?PDO $istance = null;

    public static function getIstance(array $config): PDO
    {
        if (self::$istance === null) {

        }
        return self::$istance;
    }
}