<?php

namespace Util;

use Hidehalo\Nanoid\Client;

class NanoID {

    public static function generate(): string {
        $client = new Client();
        $result = $client->generateId($size = 21);

        return $result;
    }
}