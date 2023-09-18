import 'dart:convert';
import 'dart:ffi';

import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_html/flutter_html.dart';
import 'package:web_socket_channel/io.dart';

void main() => runApp(const MyApp());

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    return const MaterialApp(
      home: WebSocketScreen(),
    );
  }
}

class WebSocketScreen extends StatefulWidget {
  const WebSocketScreen({super.key});

  @override
  _WebSocketScreenState createState() => _WebSocketScreenState();
}

class _WebSocketScreenState extends State<WebSocketScreen> {
  final timeChannel =
      IOWebSocketChannel.connect('ws://192.168.0.105:8080/time');
  final notesChannel =
      IOWebSocketChannel.connect('ws://192.168.0.105:8080/notes');

  @override
  void dispose() {
    timeChannel.sink.close();
    notesChannel.sink.close();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    List<bool> beats = [];

    return Scaffold(
      appBar: AppBar(
        title: const Text('Notes Sound Generator Receiver'),
      ),
      body: Column(
        mainAxisSize: MainAxisSize.max,
        children: <Widget>[
          const Padding(padding: EdgeInsets.only(top: 15)),
          StreamBuilder(
            stream: timeChannel.stream,
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              final message = jsonDecode(snapshot.data);
              HapticFeedback.heavyImpact();
              if (message["isFirstBeat"]) beats = [];
              beats.add(message["isFirstBeat"]);
              return Expanded(
                flex: 1,
                child: Align(
                  alignment: Alignment.center,
                  child: ListView.builder(
                    scrollDirection: Axis.horizontal,
                    itemBuilder: (context, index) {
                      return Center(
                        child: Icon(
                          Icons.circle,
                          size: 30,
                          color: beats[index] ? Colors.green : Colors.red,
                        ),
                      );
                    },
                    itemCount: beats.length,
                  ),
                ),
              );
            },
          ),
          const Padding(padding: EdgeInsets.only(top: 30)),
          StreamBuilder(
            stream: notesChannel.stream,
            builder: (context, snapshot) {
              if (!snapshot.hasData) {
                return const Center(child: CircularProgressIndicator());
              }
              final message = jsonDecode(snapshot.data);
              return Expanded(
                flex: 5,
                child: Html(data: message["data"]),
              );
            },
          ),
        ],
      ),
    );
  }
}
