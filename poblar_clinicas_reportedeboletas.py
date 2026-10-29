# -*- coding: utf-8 -*-
"""
SINCRONIZADOR CANONICO DE CLINICAS E INSTITUCIONES MEDICAS
JC PATH LAB - Aplicacion 'reportedeboletas'
100 por ciento Offline Soberano - Cero Creditos de Nube
"""

import json
import sqlite3
import os

SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
JSON_CATALOG = os.path.join(SCRIPT_DIR, 'clinicas.json')
SQLITE_DB = os.path.join(SCRIPT_DIR, 'boletas_database.sqlite')

def sync():
    if not os.path.exists(JSON_CATALOG):
        print(f"Error: No se encontro catalogo {JSON_CATALOG}")
        return
    
    with open(JSON_CATALOG, 'r', encoding='utf-8') as f:
        clinicas = json.load(f)
    
    conn = sqlite3.connect(SQLITE_DB)
    cur = conn.cursor()
    
    cur.execute('''
    CREATE TABLE IF NOT EXISTS clientes (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ruc TEXT UNIQUE NOT NULL,
        razonSocial TEXT NOT NULL,
        nombreComercial TEXT,
        direccion TEXT,
        telefono TEXT,
        email TEXT,
        ciudad TEXT,
        tipo TEXT,
        tarifaBase REAL DEFAULT 70.0,
        contacto TEXT,
        createdAt TEXT
    );
    ''')
    
    cur.execute('''
    CREATE TABLE IF NOT EXISTS boletas (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        codigo TEXT UNIQUE NOT NULL,
        clienteId INTEGER,
        razonSocial TEXT NOT NULL,
        ruc TEXT NOT NULL,
        total REAL NOT NULL,
        montos TEXT,
        numMuestras INTEGER,
        fecha TEXT,
        createdAt TEXT,
        FOREIGN KEY (clienteId) REFERENCES clientes (id)
    );
    ''')
    
    insertados = 0
    actualizados = 0
    for c in clinicas:
        cur.execute('SELECT id FROM clientes WHERE ruc = ?', (c['ruc'],))
        row = cur.fetchone()
        if row:
            cur.execute('''
            UPDATE clientes SET
                razonSocial = ?, nombreComercial = ?, direccion = ?, telefono = ?,
                email = ?, ciudad = ?, tipo = ?, tarifaBase = ?, contacto = ?
            WHERE ruc = ?
            ''', (
                c['razonSocial'], c.get('nombreComercial'), c.get('direccion'),
                c.get('telefono'), c.get('email'), c.get('ciudad'), c.get('tipo'),
                c.get('tarifaBase', 70.0), c.get('contacto'), c['ruc']
            ))
            actualizados += 1
        else:
            cur.execute('''
            INSERT INTO clientes (id, ruc, razonSocial, nombreComercial, direccion, telefono, email, ciudad, tipo, tarifaBase, contacto, createdAt)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ''', (
                c.get('id'), c['ruc'], c['razonSocial'], c.get('nombreComercial'),
                c.get('direccion'), c.get('telefono'), c.get('email'), c.get('ciudad'),
                c.get('tipo'), c.get('tarifaBase', 70.0), c.get('contacto'), c.get('createdAt')
            ))
            insertados += 1
            
    conn.commit()
    cur.execute('SELECT COUNT(*) FROM clientes')
    total = cur.fetchone()[0]
    conn.close()
    
    print(f"Sincronizacion exitosa: {total} clinicas en SQLite ({insertados} nuevas, {actualizados} actualizadas).")

if __name__ == '__main__':
    sync()
