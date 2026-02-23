<?php
use Slim\Factory\AppFactory;
use DI\Container;

require __DIR__ . '/../vendor/autoload.php';

$config = require __DIR__ . '/../conf/config.php';

$container = require __DIR__ . '/../conf/container.php';

AppFactory::setContainer($container);
$app = AppFactory::create();
$app->setBasePath($config['BASEPATH']);

(require __DIR__ . '/../conf/middleware.php')($app);
(require __DIR__ . '/../conf/routes.php')($app);

//Esempio di rotta che prende i suoi dati dal database
$app->get('/tennisti/{id}', TennistaController::class . ':listById');

$app->run();