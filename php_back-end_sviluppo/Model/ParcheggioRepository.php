<?php
namespace Model;

use PDO;

class ParcheggioRepository
{
    public function __construct(private PDO $pdo) {}

    public function findAll(): array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM parcheggi ORDER BY nome');
        $stmt->execute();
        return array_map([$this, 'decode'], $stmt->fetchAll());
    }

    public function findById(string $id): ?array
    {
        $stmt = $this->pdo->prepare('SELECT * FROM parcheggi WHERE id = :id');
        $stmt->execute(['id' => $id]);
        $row = $stmt->fetch();
        return $row ? $this->decode($row) : null;
    }

    public function create(array $data): bool
    {
        $stmt = $this->pdo->prepare(
            'INSERT INTO parcheggi
             (id, nome, indirizzo, capacita_totale, tariffa_oraria, lat, lng, tipo, servizi, image, posti_liberi)
             VALUES
             (:id, :nome, :indirizzo, :capacita_totale, :tariffa_oraria, :lat, :lng, :tipo, :servizi, :image, :posti_liberi)'
        );
        return $stmt->execute([
            'id'             => $data['id'],
            'nome'           => $data['nome'],
            'indirizzo'      => $data['indirizzo'],
            'capacita_totale'=> (int) $data['capacita_totale'],
            'tariffa_oraria' => (float) $data['tariffa_oraria'],
            'lat'            => (float) $data['lat'],
            'lng'            => (float) $data['lng'],
            'tipo'           => $data['tipo'] ?? 'scoperto',
            'servizi'        => json_encode($data['servizi'] ?? []),
            'image'          => $data['image'] ?? '',
            'posti_liberi'   => (int) $data['capacita_totale'], // inizia = capacità totale
        ]);
    }

    public function update(string $id, array $data): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE parcheggi
             SET nome = :nome, indirizzo = :indirizzo, tariffa_oraria = :tariffa_oraria,
                 lat = :lat, lng = :lng, tipo = :tipo, servizi = :servizi, image = :image,
                 capacita_totale = :capacita_totale
             WHERE id = :id'
        );
        return $stmt->execute([
            'nome'           => $data['nome'],
            'indirizzo'      => $data['indirizzo'],
            'tariffa_oraria' => (float) $data['tariffa_oraria'],
            'lat'            => (float) $data['lat'],
            'lng'            => (float) $data['lng'],
            'tipo'           => $data['tipo'],
            'servizi'        => json_encode($data['servizi'] ?? []),
            'image'          => $data['image'] ?? '',
            'capacita_totale'=> (int) $data['capacita_totale'],
            'id'             => $id,
        ]);
    }

    public function delete(string $id): bool
    {
        $stmt = $this->pdo->prepare('DELETE FROM parcheggi WHERE id = :id');
        return $stmt->execute(['id' => $id]);
    }

    // Chiamato quando si crea una prenotazione
    public function decrementaPostiLiberi(string $id): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE parcheggi SET posti_liberi = GREATEST(posti_liberi - 1, 0) WHERE id = :id'
        );
        return $stmt->execute(['id' => $id]);
    }

    // Chiamato quando si annulla una prenotazione
    public function incrementaPostiLiberi(string $id): bool
    {
        $stmt = $this->pdo->prepare(
            'UPDATE parcheggi SET posti_liberi = LEAST(posti_liberi + 1, capacita_totale) WHERE id = :id'
        );
        return $stmt->execute(['id' => $id]);
    }

    // `servizi` è salvata come JSON string: '["videosorveglianza","disabili"]'
    // Qui la decodifichiamo in array PHP così il frontend riceve un array JS
    private function decode(array $row): array
    {
        $row['servizi'] = json_decode($row['servizi'] ?? '[]', true) ?? [];
        return $row;
    }
}