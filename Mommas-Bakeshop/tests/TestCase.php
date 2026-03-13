<?php

namespace Tests;

use Illuminate\Foundation\Testing\TestCase as BaseTestCase;

abstract class TestCase extends BaseTestCase
{
    /**
     * Indicates whether the database should be seeded before each test.
     *
     * @var bool
     */
    protected $seed = true;
}
