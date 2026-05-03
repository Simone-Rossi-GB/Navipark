<?php

namespace Util;

use Hidehalo\Nanoid\Client;
use Hidehalo\Nanoid\GeneratorInterface;

class NanoID {

    public static function generate(): string {
        $client = new Client();
        $result = $client->generateId($size = 21);

        return $result;
    }
}