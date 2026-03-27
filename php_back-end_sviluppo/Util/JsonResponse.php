<?php
namespace Util;

use Psr\Http\Message\ResponseInterface as Response;

class JsonResponse
{
    public static function success(Response $response, array $status, mixed $data = null): Response
    {
        $body = [
            'success' => true,
            'code'    => $status['Code'],
            'message' => $status['message'],
            'data'    => $data,
        ];
        $response->getBody()->write(json_encode($body));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($status['httpStatus']);
    }

    public static function error(Response $response, array $status, ?array $details = null): Response
    {
        $body = [
            'success' => false,
            'code'    => $status['Code'],
            'message' => $status['message'],
            'data'    => null,
        ];
        if ($details !== null) {
            $body['details'] = $details;
        }
        $response->getBody()->write(json_encode($body));
        return $response->withHeader('Content-Type', 'application/json')->withStatus($status['httpStatus']);
    }
}
