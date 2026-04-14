<?php
use Middleware\ErrorHandlerMiddleware;
use Middleware\CorsMiddleware;
use Middleware\JsonBodyParserMiddleware;

return function ($app) {
    $app->add(new CorsMiddleware());
    $app->add(new JsonBodyParserMiddleware());
    $app->add($app->getContainer()->get(ErrorHandlerMiddleware::class));
    $app->addRoutingMiddleware();
};