<?php

namespace Model;
use Util\Connection;

class PostoRepository{

    private $config;

    public function __construct($config){
        $this->config = $config;
    }

    public function getPostoById(string $id) : array{
        $pdo = Connection::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM posti WHERE id = :id');
        $stmt->execute([
            'id' => $id
        ]);
        return $stmt->fetch();
    }

    public function getPostoByParcheggioId(string $parcheggio_id) : array{
        $pdo = Connection::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM posti WHERE parcheggio_id = :parcheggio_id');
        $stmt->execute([
            'parcheggio_id' => $parcheggio_id
        ]);
        return $stmt->fetch();
    }
}