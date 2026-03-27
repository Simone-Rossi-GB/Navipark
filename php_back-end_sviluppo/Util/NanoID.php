<?php

use Hidehalo\Nanoid\Client;
use Hidehalo\Nanoid\GeneratorInterface;

namespace Util;

class NanoID {

    public static function generate(): string {
        $client = new Client();
        $result = $client->generateId($size = 21);

        return $result;
    }
}