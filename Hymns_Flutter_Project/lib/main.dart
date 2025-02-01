
import 'package:flutter/material.dart';
import 'screens/home_screen.dart';

void main() {
  runApp(HymnsApp());
}

class HymnsApp extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Hymns',
      theme: ThemeData(
        primarySwatch: Colors.blue,
      ),
      home: HomeScreen(),
    );
  }
}
