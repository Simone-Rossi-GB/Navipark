<?php
use Middleware\ErrorHandlerMiddleware;
use Middleware\CorsMiddleware;
use Middleware\JsonBodyParserMiddleware;

return function ($app) {
    $app->add(new CorsMiddleware());
    $app->add(new JsonBodyParserMiddleware());
    $app->add(new ErrorHandlerMiddleware());
    $app->addRoutingMiddleware();
};