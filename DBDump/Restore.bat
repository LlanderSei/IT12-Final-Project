@echo off
E:
cd Documents\Llander\Yuemnigga\IT12\DBDump\
mysql -u root -p mommas-bakeshop -e "SET FOREIGN_KEY_CHECKS=0; SOURCE dbdump-mommas-bakeshop-data-only.sql SET FOREIGN_KEY_CHECKS=1;" 2> error.log