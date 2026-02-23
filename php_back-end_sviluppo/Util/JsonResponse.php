<?php
namespace Util;

use Psr\Http\Message\ResponseInterface as Response;

class JsonResponse
{
    public static function success(Response $response, array $status, ?array $data = null) {
        $body = [
            'success' => true,
            'code' => $status[1],
            'message' => $status[2]
        ];


        if ($data !== null) {
            $body['data'] = $data;
        }

        $response->getBody()->write(json_encode($body));

        return $response->withHeader('Content-Type', 'application/json')->withStatus($status[0]);
    }

    public static function error(Response $response, array $status, ?array $details = null) {

        $body = [
            'success' => true,
            'code' => $status[1],
            'message' => $status[2]
        ];

        if ($details !== null) {
            $body['details'] = $details;
        }

        $response->getBody()->write(json_encode($body));

        return $response->withHeader('Content-Type', 'application/json')->withStatus($status[0]);
    }
}