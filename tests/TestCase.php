<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    public function createApplication()
    {
        $app = parent::createApplication();
        $database = $app['config']->get('database.default');
        if ($database === 'pgsql' && ! str_ends_with((string) $app['config']->get('database.connections.pgsql.database'), '_test')) {
            throw new \RuntimeException('Las pruebas PostgreSQL exigen una base cuyo nombre termine en _test.');
        }

        return $app;
    }
}
