<?php
use Slim\Factory\AppFactory;

require __DIR__ . '/../vendor/autoload.php';

$config    = require __DIR__ . '/../conf/config.php';
$container = require __DIR__ . '/../conf/container.php';
$container->set('config', $config);

AppFactory::setContainer($container);
$app = AppFactory::create();
$app->setBasePath($config['BASEPATH']);

(require __DIR__ . '/../conf/middleware.php')($app);
(require __DIR__ . '/../conf/routes.php')($app, $container);

$app->run();