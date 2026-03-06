@echo off
E:
cd Documents\Llander\Yuemnigga\IT12\DBDump\
mysqldump -u root -p -t --complete-insert --single-transaction mommas-bakeshop --ignore-table=mommas-bakeshop.migrations > dbdump-mommas-bakeshop-data-only.sql 2> error.log