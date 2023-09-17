<?php
require 'vendor/autoload.php';

use Ratchet\ConnectionInterface;
use Ratchet\Http\HttpServer;
use Ratchet\MessageComponentInterface;
use Ratchet\Server\IoServer;
use Ratchet\WebSocket\WsServer;

class WebSocketServer implements MessageComponentInterface
{
    protected $timeClients;
    protected $notesClients;

    public function __construct()
    {
        $this->timeClients  = new \SplObjectStorage();
        $this->notesClients = new \SplObjectStorage();
    }

    public function onOpen(ConnectionInterface $conn)
    {
        $request = $conn->httpRequest;
        if ($request->getUri()->getPath() === '/time') {
            $this->timeClients->attach($conn);
            echo "New connection to time channel: {$conn->resourceId}\n";
        }
        if ($request->getUri()->getPath() === '/notes') {
            $this->notesClients->attach($conn);
            echo "New connection to notes channel: {$conn->resourceId}\n";
        }
    }

    public function onMessage(ConnectionInterface $from, $msg)
    {
        $request = $from->httpRequest;
        if ($request->getUri()->getPath() === '/time') {
            foreach ($this->timeClients as $client) {
                if ($from !== $client) {
                    $client->send($msg);
                }
            }
        }
        if ($request->getUri()->getPath() === '/notes') {
            foreach ($this->notesClients as $client) {
                if ($from !== $client) {
                    $client->send($msg);
                }
            }
        }
    }

    public function onClose(ConnectionInterface $conn)
    {
        $this->timeClients->detach($conn);
        $this->notesClients->detach($conn);
        echo "Connection {$conn->resourceId} closed\n";
    }

    public function onError(ConnectionInterface $conn, \Exception $e)
    {
        echo "Connection Error";
        $conn->close();
    }
}

$server = IoServer::factory(
    new HttpServer(
        new WsServer(
            new WebSocketServer()
        )
    ),
    8080
);

echo "Listening on 0.0.0.0:8080...\n";

$server->run();
