<?php

namespace Model;
use Util\Connection;

class ParcheggioRepository{
    
    public function getParcheggioById(string $id) : array{
        $pdo = Connection::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM parcheggi WHERE id = :id');
        $stmt->execute([
            'id' => $id
        ]);
        return $stmt->fetch();
    }
}