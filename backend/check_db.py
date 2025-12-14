import sqlite3
import os

# 检查数据库文件是否存在
print('数据库文件存在:', os.path.exists('dao\database.sqlite'))

# 连接到数据库
conn = sqlite3.connect('dao\database.sqlite')
cursor = conn.cursor()

# 获取所有表
cursor.execute("SELECT name FROM sqlite_master WHERE type='table'")
tables = cursor.fetchall()
print('所有表:', tables)

# 如果recordings表存在，查看其结构
if any(table[0] == 'recordings' for table in tables):
    print('\nrecordings表结构:')
    cursor.execute('PRAGMA table_info(recordings)')
    columns = cursor.fetchall()
    for column in columns:
        print(f'列名: {column[1]}, 类型: {column[2]}')
    
    # 查看前几条记录
    print('\nrecordings表前几条记录:')
    cursor.execute('SELECT * FROM recordings LIMIT 1')
    records = cursor.fetchall()
    for record in records:
        print(record)

conn.close()