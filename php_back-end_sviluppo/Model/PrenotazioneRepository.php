<?php

namespace Model;
use Util\Connection;

class PrenotazioneRepository{

    private $config;

    public function __construct($config){
        $this->config = $config;
    }

    public function getPrenotazioneById(string $id) : array{
        $pdo = Connection::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM prenotazioni WHERE id = :id');
        $stmt->execute([
            'id' => $id
        ]);
        return $stmt->fetch();
    }

    public function getPrenotazioneByDataOraInizio(string $data_ora_inizio) : array{
        $pdo = Connection::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM prenotazioni WHERE data_ora_inizio = :data_ora_inizio');
        $stmt->execute([
            'data_ora_inizio' => $data_ora_inizio
        ]);
        return $stmt->fetch();
    }

    public function getPrenotazioneByDataOraFine(string $data_ora_fine) : array{
        $pdo = Connection::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM prenotazioni WHERE data_ora_fine = :data_ora_fine');
        $stmt->execute([
            'data_ora_fine' => $data_ora_fine
        ]);
        return $stmt->fetch();
    }

    public function getPrenotazioneOccupyingDataInterval(string $data_ora_inizio, string $data_ora_fine) : array{
        $pdo = Connection::getInstance();
        $stmt = $pdo->prepare('SELECT * FROM prenotazioni WHERE data_ora_inizio BETWEEN :data_ora_inizio AND :data_ora_fine OR data_ora_fine BETWEEN :data_ora_inizio AND :data_ora_fine');
        $stmt->execute([
            'data_ora_inizio' => $data_ora_inizio,
            'data_ora_fine' => $data_ora_fine
        ]);
        return $stmt->fetch();
    }
}