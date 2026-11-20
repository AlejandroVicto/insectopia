-- MySQL dump 10.13  Distrib 8.0.19, for Win64 (x86_64)
--
-- Host: localhost    Database: insectopia_modelo_nuevo
-- ------------------------------------------------------
-- Server version	8.4.3

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `auditoria_roles`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auditoria_roles` (
  `id_auditoria` bigint NOT NULL AUTO_INCREMENT,
  `id_administrador` bigint NOT NULL,
  `id_usuario` bigint NOT NULL,
  `id_rol_anterior` bigint NOT NULL,
  `id_rol_nuevo` bigint NOT NULL,
  `fecha_cambio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_auditoria`),
  KEY `idx_auditoria_roles_administrador` (`id_administrador`,`fecha_cambio`),
  KEY `idx_auditoria_roles_usuario` (`id_usuario`,`fecha_cambio`),
  KEY `idx_auditoria_roles_fecha` (`fecha_cambio`),
  KEY `idx_auditoria_roles_rol_anterior` (`id_rol_anterior`),
  KEY `idx_auditoria_roles_rol_nuevo` (`id_rol_nuevo`),
  CONSTRAINT `fk_auditoria_roles_administrador` FOREIGN KEY (`id_administrador`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_auditoria_roles_rol_anterior` FOREIGN KEY (`id_rol_anterior`) REFERENCES `roles` (`id_rol`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_auditoria_roles_rol_nuevo` FOREIGN KEY (`id_rol_nuevo`) REFERENCES `roles` (`id_rol`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_auditoria_roles_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auditoria_roles`
--

LOCK TABLES `auditoria_roles` WRITE;
/*!40000 ALTER TABLE `auditoria_roles` DISABLE KEYS */;
/*!40000 ALTER TABLE `auditoria_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `comentarios`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `comentarios` (
  `id_comentario` bigint NOT NULL AUTO_INCREMENT,
  `id_publicacion` bigint NOT NULL,
  `id_usuario` bigint NOT NULL,
  `contenido` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_comentario` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_comentario`),
  KEY `idx_comentarios_publicacion` (`id_publicacion`,`fecha_comentario`),
  KEY `idx_comentarios_usuario` (`id_usuario`,`fecha_comentario`),
  CONSTRAINT `fk_comentarios_publicaciones` FOREIGN KEY (`id_publicacion`) REFERENCES `publicaciones` (`id_publicacion`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_comentarios_usuarios` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `comentarios`
--

LOCK TABLES `comentarios` WRITE;
/*!40000 ALTER TABLE `comentarios` DISABLE KEYS */;
INSERT INTO `comentarios` VALUES (1,1,1,'[DEMO-035-COMENTARIO-01-1] Comentario ficticio sobre una mariposa azul en el jardín ficticio.','2026-11-19 19:29:30','2026-11-19 19:29:30'),(2,1,2,'[DEMO-035-COMENTARIO-01-2] Comentario ficticio sobre una mariposa azul en el jardín ficticio.','2026-11-19 19:29:30','2026-11-19 19:29:30'),(3,2,2,'[DEMO-035-COMENTARIO-02-1] Comentario ficticio sobre escarabajos de colores en el bosque ficticio.','2026-11-19 19:29:30','2026-11-19 19:29:30'),(4,2,3,'[DEMO-035-COMENTARIO-02-2] Comentario ficticio sobre escarabajos de colores en el bosque ficticio.','2026-11-19 19:29:30','2026-11-19 19:29:30'),(5,3,3,'[DEMO-035-COMENTARIO-03-1] Comentario ficticio sobre libélulas sobre la laguna ficticia.','2026-11-19 19:29:30','2026-11-19 19:29:30'),(6,3,4,'[DEMO-035-COMENTARIO-03-2] Comentario ficticio sobre libélulas sobre la laguna ficticia.','2026-11-19 19:29:30','2026-11-19 19:29:30'),(7,4,4,'[DEMO-035-COMENTARIO-04-1] Comentario ficticio sobre abejas solitarias entre flores ficticias.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(8,4,5,'[DEMO-035-COMENTARIO-04-2] Comentario ficticio sobre abejas solitarias entre flores ficticias.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(9,5,5,'[DEMO-035-COMENTARIO-05-1] Comentario ficticio sobre hormigas transportando hojas ficticias.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(10,5,6,'[DEMO-035-COMENTARIO-05-2] Comentario ficticio sobre hormigas transportando hojas ficticias.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(11,6,6,'[DEMO-035-COMENTARIO-06-1] Comentario ficticio sobre un saltamontes en la pradera ficticia.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(12,6,7,'[DEMO-035-COMENTARIO-06-2] Comentario ficticio sobre un saltamontes en la pradera ficticia.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(13,7,7,'[DEMO-035-COMENTARIO-07-1] Comentario ficticio sobre chinches de colores en el muro ficticio.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(14,7,8,'[DEMO-035-COMENTARIO-07-2] Comentario ficticio sobre chinches de colores en el muro ficticio.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(15,8,8,'[DEMO-035-COMENTARIO-08-1] Comentario ficticio sobre mariposas nocturnas junto a la linterna ficticia.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(16,8,9,'[DEMO-035-COMENTARIO-08-2] Comentario ficticio sobre mariposas nocturnas junto a la linterna ficticia.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(17,9,9,'[DEMO-035-COMENTARIO-09-1] Comentario ficticio sobre una mantis en el invernadero ficticio.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(18,9,10,'[DEMO-035-COMENTARIO-09-2] Comentario ficticio sobre una mantis en el invernadero ficticio.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(19,10,10,'[DEMO-035-COMENTARIO-10-1] Comentario ficticio sobre polinizadores en el huerto ficticio.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(20,10,11,'[DEMO-035-COMENTARIO-10-2] Comentario ficticio sobre polinizadores en el huerto ficticio.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(21,11,11,'[DEMO-035-COMENTARIO-11-1] Comentario ficticio sobre grillos en la noche ficticia.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(22,11,12,'[DEMO-035-COMENTARIO-11-2] Comentario ficticio sobre grillos en la noche ficticia.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(23,12,12,'[DEMO-035-COMENTARIO-12-1] Comentario ficticio sobre un escarabajo rinoceronte en el tronco ficticio.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(24,12,13,'[DEMO-035-COMENTARIO-12-2] Comentario ficticio sobre un escarabajo rinoceronte en el tronco ficticio.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(25,13,13,'[DEMO-035-COMENTARIO-13-1] Comentario ficticio sobre avispas constructoras de nidos ficticios.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(26,13,14,'[DEMO-035-COMENTARIO-13-2] Comentario ficticio sobre avispas constructoras de nidos ficticios.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(27,14,14,'[DEMO-035-COMENTARIO-14-1] Comentario ficticio sobre toxorquas en el sendero ficticio.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(28,14,15,'[DEMO-035-COMENTARIO-14-2] Comentario ficticio sobre toxorquas en el sendero ficticio.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(29,15,15,'[DEMO-035-COMENTARIO-15-1] Comentario ficticio sobre mariposas migrando sobre el valle ficticio.','2026-11-19 19:29:31','2026-11-19 19:29:31'),(30,15,1,'[DEMO-035-COMENTARIO-15-2] Comentario ficticio sobre mariposas migrando sobre el valle ficticio.','2026-11-19 19:29:31','2026-11-19 19:29:31');
/*!40000 ALTER TABLE `comentarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `conversaciones`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `conversaciones` (
  `id_conversacion` bigint NOT NULL AUTO_INCREMENT,
  `clave_directa` varchar(45) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_conversacion`),
  UNIQUE KEY `uk_conversaciones_clave_directa` (`clave_directa`)
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `conversaciones`
--

LOCK TABLES `conversaciones` WRITE;
/*!40000 ALTER TABLE `conversaciones` DISABLE KEYS */;
INSERT INTO `conversaciones` VALUES (1,'DEMO-036-CONV-01','2026-10-20 19:29:31'),(2,'DEMO-036-CONV-02','2026-10-21 19:29:31'),(3,'DEMO-036-CONV-03','2026-10-22 19:29:31'),(4,'DEMO-036-CONV-04','2026-10-23 19:29:31'),(5,'DEMO-036-CONV-05','2026-10-24 19:29:31'),(6,'DEMO-036-CONV-06','2026-10-25 19:29:31'),(7,'DEMO-036-CONV-07','2026-10-26 19:29:31'),(8,'DEMO-036-CONV-08','2026-10-27 19:29:31'),(9,'DEMO-036-CONV-09','2026-10-28 19:29:31'),(10,'DEMO-036-CONV-10','2026-10-29 19:29:31'),(11,'DEMO-036-CONV-11','2026-10-30 19:29:31'),(12,'DEMO-036-CONV-12','2026-10-31 19:29:31'),(13,'DEMO-036-CONV-13','2026-11-01 19:29:31'),(14,'DEMO-036-CONV-14','2026-11-02 19:29:31'),(15,'DEMO-036-CONV-15','2026-11-03 19:29:31');
/*!40000 ALTER TABLE `conversaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `eventos`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `eventos` (
  `id_evento` bigint NOT NULL AUTO_INCREMENT,
  `id_proponente` bigint NOT NULL,
  `id_moderador` bigint DEFAULT NULL,
  `titulo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `ubicacion` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `imagen` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_inicio` datetime NOT NULL,
  `fecha_fin` datetime NOT NULL,
  `cupo_maximo` int NOT NULL,
  `estado` enum('PENDIENTE','APROBADO','RECHAZADO','CANCELADO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDIENTE',
  `motivo_resolucion` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_resolucion` datetime DEFAULT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_evento`),
  KEY `idx_eventos_estado_fecha` (`estado`,`fecha_inicio`),
  KEY `idx_eventos_fechas` (`fecha_inicio`,`fecha_fin`),
  KEY `idx_eventos_proponente` (`id_proponente`,`fecha_creacion`),
  KEY `fk_eventos_moderador` (`id_moderador`),
  CONSTRAINT `fk_eventos_moderador` FOREIGN KEY (`id_moderador`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_eventos_proponente` FOREIGN KEY (`id_proponente`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_eventos_cupo_positivo` CHECK ((`cupo_maximo` > 0)),
  CONSTRAINT `chk_eventos_fechas` CHECK ((`fecha_fin` >= `fecha_inicio`))
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `eventos`
--

LOCK TABLES `eventos` WRITE;
/*!40000 ALTER TABLE `eventos` DISABLE KEYS */;
INSERT INTO `eventos` VALUES (1,4,2,'[DEMO-037-01] Jornada ficticia de mariposas azules','Descripción ficticia de demostración: Jornada ficticia de mariposas azules.','Jardín ficticio de las Mariposas',NULL,'2026-11-29 10:00:00','2026-11-29 12:00:00',10,'APROBADO','Resolución ficticia de demostración.','2026-10-21 19:29:32','2026-10-20 19:29:32','2026-10-20 19:29:32'),(2,5,NULL,'[DEMO-037-02] Taller ficticio de escarabajos de colores','Descripción ficticia de demostración: Taller ficticio de escarabajos de colores.','Bosque ficticio de los Coleópteros',NULL,'2026-11-30 10:00:00','2026-11-30 12:00:00',11,'PENDIENTE',NULL,NULL,'2026-10-21 19:29:32','2026-10-21 19:29:32'),(3,6,2,'[DEMO-037-03] Caminata ficticia para observar libélulas','Descripción ficticia de demostración: Caminata ficticia para observar libélulas.','Laguna ficticia de las Libélulas',NULL,'2026-12-01 10:00:00','2026-12-01 12:00:00',12,'RECHAZADO','Resolución ficticia de demostración.','2026-10-23 19:29:32','2026-10-22 19:29:32','2026-10-22 19:29:32'),(4,7,2,'[DEMO-037-04] Encuentro ficticio sobre abejas solitarias','Descripción ficticia de demostración: Encuentro ficticio sobre abejas solitarias.','Huerto ficticio de las Abejas',NULL,'2026-12-02 10:00:00','2026-12-02 12:00:00',13,'APROBADO','Resolución ficticia de demostración.','2026-10-24 19:29:32','2026-10-23 19:29:32','2026-10-23 19:29:32'),(5,8,NULL,'[DEMO-037-05] Ruta ficticia de hormigas y hojas','Descripción ficticia de demostración: Ruta ficticia de hormigas y hojas.','Sendero ficticio de las Hormigas',NULL,'2026-12-03 10:00:00','2026-12-03 12:00:00',14,'PENDIENTE',NULL,NULL,'2026-10-24 19:29:32','2026-10-24 19:29:32'),(6,9,2,'[DEMO-037-06] Noche ficticia de saltamontes','Descripción ficticia de demostración: Noche ficticia de saltamontes.','Pradera ficticia de los Grillos',NULL,'2026-12-04 10:00:00','2026-12-04 12:00:00',15,'RECHAZADO','Resolución ficticia de demostración.','2026-10-26 19:29:32','2026-10-25 19:29:32','2026-10-25 19:29:32'),(7,10,2,'[DEMO-037-07] Fotografía ficticia de chinches','Descripción ficticia de demostración: Fotografía ficticia de chinches.','Muro ficticio de las Chinches',NULL,'2026-12-05 10:00:00','2026-12-05 12:00:00',16,'APROBADO','Resolución ficticia de demostración.','2026-10-27 19:29:32','2026-10-26 19:29:32','2026-10-26 19:29:32'),(8,11,NULL,'[DEMO-037-08] Observación ficticia de mariposas nocturnas','Descripción ficticia de demostración: Observación ficticia de mariposas nocturnas.','Linterna ficticia del Valle',NULL,'2026-12-06 10:00:00','2026-12-06 12:00:00',17,'PENDIENTE',NULL,NULL,'2026-10-27 19:29:32','2026-10-27 19:29:32'),(9,12,2,'[DEMO-037-09] Visita ficticia a una mantis','Descripción ficticia de demostración: Visita ficticia a una mantis.','Invernadero ficticio de las Mantis',NULL,'2026-12-07 10:00:00','2026-12-07 12:00:00',18,'RECHAZADO','Resolución ficticia de demostración.','2026-10-29 19:29:32','2026-10-28 19:29:32','2026-10-28 19:29:32'),(10,13,2,'[DEMO-037-10] Jornada ficticia de polinización','Descripción ficticia de demostración: Jornada ficticia de polinización.','Huerto ficticio de la Polinización',NULL,'2026-12-08 10:00:00','2026-12-08 12:00:00',19,'APROBADO','Resolución ficticia de demostración.','2026-10-30 19:29:32','2026-10-29 19:29:32','2026-10-29 19:29:32'),(11,14,NULL,'[DEMO-037-11] Concierto ficticio de grillos','Descripción ficticia de demostración: Concierto ficticio de grillos.','Campo ficticio de los Grillos Cantores',NULL,'2026-12-09 10:00:00','2026-12-09 12:00:00',20,'PENDIENTE',NULL,NULL,'2026-10-30 19:29:32','2026-10-30 19:29:32'),(12,15,2,'[DEMO-037-12] Expedición ficticia al escarabajo rinoceronte','Descripción ficticia de demostración: Expedición ficticia al escarabajo rinoceronte.','Tronco ficticio del Rinoceronte',NULL,'2026-12-10 10:00:00','2026-12-10 12:00:00',21,'RECHAZADO','Resolución ficticia de demostración.','2026-11-01 19:29:32','2026-10-31 19:29:32','2026-10-31 19:29:32'),(13,1,2,'[DEMO-037-13] Taller ficticio de avispas constructoras','Descripción ficticia de demostración: Taller ficticio de avispas constructoras.','Nido ficticio de las Avispas',NULL,'2026-12-11 10:00:00','2026-12-11 12:00:00',22,'APROBADO','Resolución ficticia de demostración.','2026-11-02 19:29:32','2026-11-01 19:29:32','2026-11-01 19:29:32'),(14,2,NULL,'[DEMO-037-14] Paseo ficticio entre toxorquas','Descripción ficticia de demostración: Paseo ficticio entre toxorquas.','Camino ficticio de las Toxorquas',NULL,'2026-12-12 10:00:00','2026-12-12 12:00:00',23,'PENDIENTE',NULL,NULL,'2026-11-02 19:29:32','2026-11-02 19:29:32'),(15,3,2,'[DEMO-037-15] Seguimiento ficticio de mariposas migratorias','Descripción ficticia de demostración: Seguimiento ficticio de mariposas migratorias.','Valle ficticio de la Migración',NULL,'2026-12-13 10:00:00','2026-12-13 12:00:00',24,'RECHAZADO','Resolución ficticia de demostración.','2026-11-04 19:29:32','2026-11-03 19:29:32','2026-11-03 19:29:32');
/*!40000 ALTER TABLE `eventos` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flyway_schema_history`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `flyway_schema_history` (
  `installed_rank` int NOT NULL,
  `version` varchar(50) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `description` varchar(200) COLLATE utf8mb4_unicode_ci NOT NULL,
  `type` varchar(20) COLLATE utf8mb4_unicode_ci NOT NULL,
  `script` varchar(1000) COLLATE utf8mb4_unicode_ci NOT NULL,
  `checksum` int DEFAULT NULL,
  `installed_by` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `installed_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `execution_time` int NOT NULL,
  `success` tinyint(1) NOT NULL,
  PRIMARY KEY (`installed_rank`),
  KEY `flyway_schema_history_s_idx` (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flyway_schema_history`
--

LOCK TABLES `flyway_schema_history` WRITE;
/*!40000 ALTER TABLE `flyway_schema_history` DISABLE KEYS */;
INSERT INTO `flyway_schema_history` VALUES (1,'1','crear roles usuarios','SQL','V1__crear_roles_usuarios.sql',-1114147793,'insectopia_user','2026-11-20 01:25:34',1923,1),(2,'2','crear seguidores','SQL','V2__crear_seguidores.sql',1664804569,'insectopia_user','2026-11-20 01:25:35',345,1),(3,'3','crear publicaciones','SQL','V3__crear_publicaciones.sql',-1958122993,'insectopia_user','2026-11-20 01:25:36',1095,1),(4,'4','crear mensajes','SQL','V4__crear_mensajes.sql',270482038,'insectopia_user','2026-11-20 01:25:37',1162,1),(5,'5','crear notificaciones','SQL','V5__crear_notificaciones.sql',2078367887,'insectopia_user','2026-11-20 01:25:38',499,1),(6,'6','crear eventos','SQL','V6__crear_eventos.sql',-1365301109,'insectopia_user','2026-11-20 01:25:40',1889,1),(7,'7','crear reportes','SQL','V7__crear_reportes.sql',1498532963,'insectopia_user','2026-11-20 01:25:42',1937,1),(8,'8','crear tokens seguridad','SQL','V8__crear_tokens_seguridad.sql',637412158,'insectopia_user','2026-11-20 01:25:42',825,1),(9,'9','insertar roles','SQL','V9__insertar_roles.sql',-211646636,'insectopia_user','2026-11-20 01:25:43',12,1),(10,'10','crear auditoria roles','SQL','V10__crear_auditoria_roles.sql',757926139,'insectopia_user','2026-11-20 01:25:43',536,1);
/*!40000 ALTER TABLE `flyway_schema_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mensajes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mensajes` (
  `id_mensaje` bigint NOT NULL AUTO_INCREMENT,
  `id_conversacion` bigint NOT NULL,
  `id_remitente` bigint NOT NULL,
  `contenido` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_envio` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_mensaje`),
  KEY `idx_mensajes_conversacion_fecha` (`id_conversacion`,`fecha_envio`,`id_mensaje`),
  KEY `idx_mensajes_participante` (`id_conversacion`,`id_remitente`),
  KEY `fk_mensajes_remitente` (`id_remitente`),
  CONSTRAINT `fk_mensajes_conversacion` FOREIGN KEY (`id_conversacion`) REFERENCES `conversaciones` (`id_conversacion`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_mensajes_participante` FOREIGN KEY (`id_conversacion`, `id_remitente`) REFERENCES `participantes_conversacion` (`id_conversacion`, `id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_mensajes_remitente` FOREIGN KEY (`id_remitente`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=51 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mensajes`
--

LOCK TABLES `mensajes` WRITE;
/*!40000 ALTER TABLE `mensajes` DISABLE KEYS */;
INSERT INTO `mensajes` VALUES (1,1,1,'[DEMO-036-MENSAJE-01-01] Mensaje ficticio sobre una mariposa azul en el jardín ficticio.','2026-10-20 19:39:31'),(2,2,2,'[DEMO-036-MENSAJE-02-01] Mensaje ficticio sobre escarabajos de colores en el bosque ficticio.','2026-10-21 19:39:31'),(3,3,3,'[DEMO-036-MENSAJE-03-01] Mensaje ficticio sobre libélulas sobre la laguna ficticia.','2026-10-22 19:39:31'),(4,4,4,'[DEMO-036-MENSAJE-04-01] Mensaje ficticio sobre abejas solitarias entre flores ficticias.','2026-10-23 19:39:31'),(5,5,5,'[DEMO-036-MENSAJE-05-01] Mensaje ficticio sobre hormigas transportando hojas ficticias.','2026-10-24 19:39:31'),(6,6,6,'[DEMO-036-MENSAJE-06-01] Mensaje ficticio sobre un saltamontes en la pradera ficticia.','2026-10-25 19:39:31'),(7,7,7,'[DEMO-036-MENSAJE-07-01] Mensaje ficticio sobre chinches de colores en el muro ficticio.','2026-10-26 19:39:31'),(8,8,8,'[DEMO-036-MENSAJE-08-01] Mensaje ficticio sobre mariposas nocturnas junto a la linterna ficticia.','2026-10-27 19:39:31'),(9,9,9,'[DEMO-036-MENSAJE-09-01] Mensaje ficticio sobre una mantis en el invernadero ficticio.','2026-10-28 19:39:31'),(10,10,10,'[DEMO-036-MENSAJE-10-01] Mensaje ficticio sobre polinizadores en el huerto ficticio.','2026-10-29 19:39:31'),(11,11,11,'[DEMO-036-MENSAJE-11-01] Mensaje ficticio sobre grillos en la noche ficticia.','2026-10-30 19:39:31'),(12,12,12,'[DEMO-036-MENSAJE-12-01] Mensaje ficticio sobre un escarabajo rinoceronte en el tronco ficticio.','2026-10-31 19:39:31'),(13,13,13,'[DEMO-036-MENSAJE-13-01] Mensaje ficticio sobre avispas constructoras de nidos ficticios.','2026-11-01 19:39:31'),(14,14,14,'[DEMO-036-MENSAJE-14-01] Mensaje ficticio sobre toxorquas en el sendero ficticio.','2026-11-02 19:39:31'),(15,15,15,'[DEMO-036-MENSAJE-15-01] Mensaje ficticio sobre mariposas migrando sobre el valle ficticio.','2026-11-03 19:39:31'),(16,1,2,'[DEMO-036-MENSAJE-01-02] Mensaje ficticio sobre una mariposa azul en el jardín ficticio.','2026-10-20 19:49:31'),(17,2,3,'[DEMO-036-MENSAJE-02-02] Mensaje ficticio sobre escarabajos de colores en el bosque ficticio.','2026-10-21 19:49:31'),(18,3,4,'[DEMO-036-MENSAJE-03-02] Mensaje ficticio sobre libélulas sobre la laguna ficticia.','2026-10-22 19:49:31'),(19,4,5,'[DEMO-036-MENSAJE-04-02] Mensaje ficticio sobre abejas solitarias entre flores ficticias.','2026-10-23 19:49:31'),(20,5,6,'[DEMO-036-MENSAJE-05-02] Mensaje ficticio sobre hormigas transportando hojas ficticias.','2026-10-24 19:49:31'),(21,6,7,'[DEMO-036-MENSAJE-06-02] Mensaje ficticio sobre un saltamontes en la pradera ficticia.','2026-10-25 19:49:31'),(22,7,8,'[DEMO-036-MENSAJE-07-02] Mensaje ficticio sobre chinches de colores en el muro ficticio.','2026-10-26 19:49:31'),(23,8,9,'[DEMO-036-MENSAJE-08-02] Mensaje ficticio sobre mariposas nocturnas junto a la linterna ficticia.','2026-10-27 19:49:31'),(24,9,10,'[DEMO-036-MENSAJE-09-02] Mensaje ficticio sobre una mantis en el invernadero ficticio.','2026-10-28 19:49:31'),(25,10,11,'[DEMO-036-MENSAJE-10-02] Mensaje ficticio sobre polinizadores en el huerto ficticio.','2026-10-29 19:49:31'),(26,11,12,'[DEMO-036-MENSAJE-11-02] Mensaje ficticio sobre grillos en la noche ficticia.','2026-10-30 19:49:31'),(27,12,13,'[DEMO-036-MENSAJE-12-02] Mensaje ficticio sobre un escarabajo rinoceronte en el tronco ficticio.','2026-10-31 19:49:31'),(28,13,14,'[DEMO-036-MENSAJE-13-02] Mensaje ficticio sobre avispas constructoras de nidos ficticios.','2026-11-01 19:49:31'),(29,14,15,'[DEMO-036-MENSAJE-14-02] Mensaje ficticio sobre toxorquas en el sendero ficticio.','2026-11-02 19:49:31'),(30,15,1,'[DEMO-036-MENSAJE-15-02] Mensaje ficticio sobre mariposas migrando sobre el valle ficticio.','2026-11-03 19:49:31'),(31,1,1,'[DEMO-036-MENSAJE-01-03] Mensaje ficticio sobre una mariposa azul en el jardín ficticio.','2026-10-20 19:59:31'),(32,2,2,'[DEMO-036-MENSAJE-02-03] Mensaje ficticio sobre escarabajos de colores en el bosque ficticio.','2026-10-21 19:59:31'),(33,3,3,'[DEMO-036-MENSAJE-03-03] Mensaje ficticio sobre libélulas sobre la laguna ficticia.','2026-10-22 19:59:31'),(34,4,4,'[DEMO-036-MENSAJE-04-03] Mensaje ficticio sobre abejas solitarias entre flores ficticias.','2026-10-23 19:59:31'),(35,5,5,'[DEMO-036-MENSAJE-05-03] Mensaje ficticio sobre hormigas transportando hojas ficticias.','2026-10-24 19:59:31'),(36,6,6,'[DEMO-036-MENSAJE-06-03] Mensaje ficticio sobre un saltamontes en la pradera ficticia.','2026-10-25 19:59:31'),(37,7,7,'[DEMO-036-MENSAJE-07-03] Mensaje ficticio sobre chinches de colores en el muro ficticio.','2026-10-26 19:59:31'),(38,8,8,'[DEMO-036-MENSAJE-08-03] Mensaje ficticio sobre mariposas nocturnas junto a la linterna ficticia.','2026-10-27 19:59:31'),(39,9,9,'[DEMO-036-MENSAJE-09-03] Mensaje ficticio sobre una mantis en el invernadero ficticio.','2026-10-28 19:59:31'),(40,10,10,'[DEMO-036-MENSAJE-10-03] Mensaje ficticio sobre polinizadores en el huerto ficticio.','2026-10-29 19:59:31'),(41,11,11,'[DEMO-036-MENSAJE-11-03] Mensaje ficticio sobre grillos en la noche ficticia.','2026-10-30 19:59:31'),(42,12,12,'[DEMO-036-MENSAJE-12-03] Mensaje ficticio sobre un escarabajo rinoceronte en el tronco ficticio.','2026-10-31 19:59:31'),(43,13,13,'[DEMO-036-MENSAJE-13-03] Mensaje ficticio sobre avispas constructoras de nidos ficticios.','2026-11-01 19:59:31'),(44,14,14,'[DEMO-036-MENSAJE-14-03] Mensaje ficticio sobre toxorquas en el sendero ficticio.','2026-11-02 19:59:31'),(45,15,15,'[DEMO-036-MENSAJE-15-03] Mensaje ficticio sobre mariposas migrando sobre el valle ficticio.','2026-11-03 19:59:31'),(46,1,2,'[DEMO-036-MENSAJE-01-04] Mensaje ficticio sobre una mariposa azul en el jardín ficticio.','2026-10-20 20:09:31'),(47,2,3,'[DEMO-036-MENSAJE-02-04] Mensaje ficticio sobre escarabajos de colores en el bosque ficticio.','2026-10-21 20:09:31'),(48,3,4,'[DEMO-036-MENSAJE-03-04] Mensaje ficticio sobre libélulas sobre la laguna ficticia.','2026-10-22 20:09:31'),(49,4,5,'[DEMO-036-MENSAJE-04-04] Mensaje ficticio sobre abejas solitarias entre flores ficticias.','2026-10-23 20:09:31'),(50,5,6,'[DEMO-036-MENSAJE-05-04] Mensaje ficticio sobre hormigas transportando hojas ficticias.','2026-10-24 20:09:31');
/*!40000 ALTER TABLE `mensajes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `notificaciones`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `notificaciones` (
  `id_notificacion` bigint NOT NULL AUTO_INCREMENT,
  `id_destinatario` bigint NOT NULL,
  `id_actor` bigint DEFAULT NULL,
  `id_publicacion` bigint DEFAULT NULL,
  `id_evento` bigint DEFAULT NULL,
  `id_mensaje` bigint DEFAULT NULL,
  `id_reporte` bigint DEFAULT NULL,
  `tipo` varchar(40) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contenido` varchar(500) COLLATE utf8mb4_unicode_ci NOT NULL,
  `leida` tinyint(1) NOT NULL DEFAULT '0',
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_notificacion`),
  KEY `idx_notificaciones_destinatario` (`id_destinatario`,`leida`,`fecha_creacion`),
  KEY `fk_notificaciones_actor` (`id_actor`),
  KEY `fk_notificaciones_publicacion` (`id_publicacion`),
  KEY `fk_notificaciones_mensaje` (`id_mensaje`),
  KEY `fk_notificaciones_evento` (`id_evento`),
  KEY `fk_notificaciones_reporte` (`id_reporte`),
  CONSTRAINT `fk_notificaciones_actor` FOREIGN KEY (`id_actor`) REFERENCES `usuarios` (`id_usuario`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_notificaciones_destinatario` FOREIGN KEY (`id_destinatario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_notificaciones_evento` FOREIGN KEY (`id_evento`) REFERENCES `eventos` (`id_evento`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_notificaciones_mensaje` FOREIGN KEY (`id_mensaje`) REFERENCES `mensajes` (`id_mensaje`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_notificaciones_publicacion` FOREIGN KEY (`id_publicacion`) REFERENCES `publicaciones` (`id_publicacion`) ON DELETE SET NULL ON UPDATE RESTRICT,
  CONSTRAINT `fk_notificaciones_reporte` FOREIGN KEY (`id_reporte`) REFERENCES `reportes` (`id_reporte`) ON DELETE SET NULL ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `notificaciones`
--

LOCK TABLES `notificaciones` WRITE;
/*!40000 ALTER TABLE `notificaciones` DISABLE KEYS */;
INSERT INTO `notificaciones` VALUES (1,1,2,NULL,NULL,NULL,NULL,'NUEVO_SEGUIDOR','[DEMO-038-NOTIFICACION-01] Notificación ficticia de demostración.',1,'2026-11-14 19:29:32'),(2,2,3,2,NULL,NULL,NULL,'NUEVA_PUBLICACION','[DEMO-038-NOTIFICACION-02] Notificación ficticia de demostración.',0,'2026-11-14 20:29:32'),(3,3,4,NULL,NULL,3,NULL,'NUEVO_MENSAJE','[DEMO-038-NOTIFICACION-03] Notificación ficticia de demostración.',1,'2026-11-14 21:29:32'),(4,4,5,NULL,4,NULL,NULL,'EVENTO_APROBADO','[DEMO-038-NOTIFICACION-04] Notificación ficticia de demostración.',0,'2026-11-14 22:29:32'),(5,5,6,NULL,NULL,NULL,5,'NUEVO_REPORTE','[DEMO-038-NOTIFICACION-05] Notificación ficticia de demostración.',1,'2026-11-14 23:29:32'),(6,6,7,NULL,NULL,NULL,NULL,'NUEVO_SEGUIDOR','[DEMO-038-NOTIFICACION-06] Notificación ficticia de demostración.',0,'2026-11-15 00:29:32'),(7,7,8,7,NULL,NULL,NULL,'NUEVA_PUBLICACION','[DEMO-038-NOTIFICACION-07] Notificación ficticia de demostración.',1,'2026-11-15 01:29:32'),(8,8,9,NULL,NULL,8,NULL,'NUEVO_MENSAJE','[DEMO-038-NOTIFICACION-08] Notificación ficticia de demostración.',0,'2026-11-15 02:29:32'),(9,9,10,NULL,9,NULL,NULL,'EVENTO_APROBADO','[DEMO-038-NOTIFICACION-09] Notificación ficticia de demostración.',1,'2026-11-15 03:29:32'),(10,10,11,NULL,NULL,NULL,10,'NUEVO_REPORTE','[DEMO-038-NOTIFICACION-10] Notificación ficticia de demostración.',0,'2026-11-15 04:29:32'),(11,11,12,NULL,NULL,NULL,NULL,'NUEVO_SEGUIDOR','[DEMO-038-NOTIFICACION-11] Notificación ficticia de demostración.',1,'2026-11-15 05:29:32'),(12,12,13,12,NULL,NULL,NULL,'NUEVA_PUBLICACION','[DEMO-038-NOTIFICACION-12] Notificación ficticia de demostración.',0,'2026-11-15 06:29:32'),(13,13,14,NULL,NULL,13,NULL,'NUEVO_MENSAJE','[DEMO-038-NOTIFICACION-13] Notificación ficticia de demostración.',1,'2026-11-15 07:29:32'),(14,14,15,NULL,14,NULL,NULL,'EVENTO_APROBADO','[DEMO-038-NOTIFICACION-14] Notificación ficticia de demostración.',0,'2026-11-15 08:29:32'),(15,15,1,NULL,NULL,NULL,15,'NUEVO_REPORTE','[DEMO-038-NOTIFICACION-15] Notificación ficticia de demostración.',1,'2026-11-15 09:29:32'),(16,1,2,NULL,NULL,NULL,NULL,'NUEVO_SEGUIDOR','[DEMO-038-NOTIFICACION-16] Notificación ficticia de demostración.',0,'2026-11-15 10:29:32'),(17,2,3,2,NULL,NULL,NULL,'NUEVA_PUBLICACION','[DEMO-038-NOTIFICACION-17] Notificación ficticia de demostración.',1,'2026-11-15 11:29:32'),(18,3,4,NULL,NULL,18,NULL,'NUEVO_MENSAJE','[DEMO-038-NOTIFICACION-18] Notificación ficticia de demostración.',0,'2026-11-15 12:29:32'),(19,4,5,NULL,4,NULL,NULL,'EVENTO_APROBADO','[DEMO-038-NOTIFICACION-19] Notificación ficticia de demostración.',1,'2026-11-15 13:29:32'),(20,5,6,NULL,NULL,NULL,5,'NUEVO_REPORTE','[DEMO-038-NOTIFICACION-20] Notificación ficticia de demostración.',0,'2026-11-15 14:29:32');
/*!40000 ALTER TABLE `notificaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `participantes_conversacion`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `participantes_conversacion` (
  `id_conversacion` bigint NOT NULL,
  `id_usuario` bigint NOT NULL,
  `fecha_ingreso` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_ultima_lectura` datetime DEFAULT NULL,
  `oculta` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id_conversacion`,`id_usuario`),
  KEY `idx_participantes_conversacion_usuario` (`id_usuario`,`id_conversacion`),
  CONSTRAINT `fk_participantes_conversacion_conversaciones` FOREIGN KEY (`id_conversacion`) REFERENCES `conversaciones` (`id_conversacion`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_participantes_conversacion_usuarios` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `participantes_conversacion`
--

LOCK TABLES `participantes_conversacion` WRITE;
/*!40000 ALTER TABLE `participantes_conversacion` DISABLE KEYS */;
INSERT INTO `participantes_conversacion` VALUES (1,1,'2026-10-20 19:30:31',NULL,0),(1,2,'2026-10-20 19:31:31',NULL,0),(2,2,'2026-10-21 19:30:31',NULL,0),(2,3,'2026-10-21 19:31:31',NULL,0),(3,3,'2026-10-22 19:30:31',NULL,0),(3,4,'2026-10-22 19:31:31',NULL,0),(4,4,'2026-10-23 19:30:31',NULL,0),(4,5,'2026-10-23 19:31:31',NULL,0),(5,5,'2026-10-24 19:30:31',NULL,0),(5,6,'2026-10-24 19:31:31',NULL,0),(6,6,'2026-10-25 19:30:31',NULL,0),(6,7,'2026-10-25 19:31:31',NULL,0),(7,7,'2026-10-26 19:30:31',NULL,0),(7,8,'2026-10-26 19:31:31',NULL,0),(8,8,'2026-10-27 19:30:31',NULL,0),(8,9,'2026-10-27 19:31:31',NULL,0),(9,9,'2026-10-28 19:30:31',NULL,0),(9,10,'2026-10-28 19:31:31',NULL,0),(10,10,'2026-10-29 19:30:31',NULL,0),(10,11,'2026-10-29 19:31:31',NULL,0),(11,11,'2026-10-30 19:30:31',NULL,0),(11,12,'2026-10-30 19:31:31',NULL,0),(12,12,'2026-10-31 19:30:31',NULL,0),(12,13,'2026-10-31 19:31:31',NULL,0),(13,13,'2026-11-01 19:30:31',NULL,0),(13,14,'2026-11-01 19:31:31',NULL,0),(14,14,'2026-11-02 19:30:31',NULL,0),(14,15,'2026-11-02 19:31:31',NULL,0),(15,1,'2026-11-03 19:31:31',NULL,0),(15,15,'2026-11-03 19:30:31',NULL,0);
/*!40000 ALTER TABLE `participantes_conversacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `participantes_evento`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `participantes_evento` (
  `id_evento` bigint NOT NULL,
  `id_usuario` bigint NOT NULL,
  `fecha_inscripcion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `estado` enum('INSCRITO','CANCELADO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'INSCRITO',
  `fecha_cancelacion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_evento`,`id_usuario`),
  KEY `idx_participantes_evento_usuario` (`id_usuario`,`estado`,`fecha_inscripcion`),
  CONSTRAINT `fk_participantes_evento_eventos` FOREIGN KEY (`id_evento`) REFERENCES `eventos` (`id_evento`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_participantes_evento_usuarios` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_participantes_evento_cancelacion` CHECK (((`fecha_cancelacion` is null) or (`fecha_cancelacion` >= `fecha_inscripcion`)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `participantes_evento`
--

LOCK TABLES `participantes_evento` WRITE;
/*!40000 ALTER TABLE `participantes_evento` DISABLE KEYS */;
INSERT INTO `participantes_evento` VALUES (1,1,'2026-10-23 19:29:32','INSCRITO',NULL),(1,2,'2026-10-23 19:29:32','CANCELADO','2026-10-24 19:29:32'),(1,3,'2026-10-23 19:29:32','INSCRITO',NULL),(1,4,'2026-10-23 19:29:32','INSCRITO',NULL),(1,5,'2026-10-23 19:29:32','INSCRITO',NULL),(1,6,'2026-10-23 19:29:32','INSCRITO',NULL),(4,4,'2026-10-26 19:29:32','INSCRITO',NULL),(4,5,'2026-10-26 19:29:32','CANCELADO','2026-10-27 19:29:32'),(4,6,'2026-10-26 19:29:32','INSCRITO',NULL),(4,7,'2026-10-26 19:29:32','INSCRITO',NULL),(4,8,'2026-10-26 19:29:32','INSCRITO',NULL),(4,9,'2026-10-26 19:29:32','INSCRITO',NULL),(7,7,'2026-10-29 19:29:32','INSCRITO',NULL),(7,8,'2026-10-29 19:29:32','CANCELADO','2026-10-30 19:29:32'),(7,9,'2026-10-29 19:29:32','INSCRITO',NULL),(7,10,'2026-10-29 19:29:32','INSCRITO',NULL),(7,11,'2026-10-29 19:29:32','INSCRITO',NULL),(7,12,'2026-10-29 19:29:32','INSCRITO',NULL),(10,10,'2026-11-01 19:29:32','INSCRITO',NULL),(10,11,'2026-11-01 19:29:32','CANCELADO','2026-11-02 19:29:32'),(10,12,'2026-11-01 19:29:32','INSCRITO',NULL),(10,13,'2026-11-01 19:29:32','INSCRITO',NULL),(10,14,'2026-11-01 19:29:32','INSCRITO',NULL),(10,15,'2026-11-01 19:29:32','INSCRITO',NULL),(13,1,'2026-11-04 19:29:32','INSCRITO',NULL),(13,2,'2026-11-04 19:29:32','INSCRITO',NULL),(13,3,'2026-11-04 19:29:32','INSCRITO',NULL),(13,13,'2026-11-04 19:29:32','INSCRITO',NULL),(13,14,'2026-11-04 19:29:32','CANCELADO','2026-11-05 19:29:32'),(13,15,'2026-11-04 19:29:32','INSCRITO',NULL);
/*!40000 ALTER TABLE `participantes_evento` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `publicaciones`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `publicaciones` (
  `id_publicacion` bigint NOT NULL AUTO_INCREMENT,
  `id_usuario` bigint NOT NULL,
  `contenido` text COLLATE utf8mb4_unicode_ci NOT NULL,
  `imagen` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('VISIBLE','OCULTA','ELIMINADA') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'VISIBLE',
  `fecha_publicacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_publicacion`),
  KEY `idx_publicaciones_feed` (`estado`,`fecha_publicacion`),
  KEY `idx_publicaciones_usuario` (`id_usuario`,`fecha_publicacion`),
  CONSTRAINT `fk_publicaciones_usuarios` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `publicaciones`
--

LOCK TABLES `publicaciones` WRITE;
/*!40000 ALTER TABLE `publicaciones` DISABLE KEYS */;
INSERT INTO `publicaciones` VALUES (1,1,'[DEMO-035-PUBLICACION-01] una mariposa azul en el jardín ficticio. Publicación ficticia de Insectopia.',NULL,'VISIBLE','2026-11-19 19:29:30','2026-11-19 19:29:30'),(2,2,'[DEMO-035-PUBLICACION-02] escarabajos de colores en el bosque ficticio. Publicación ficticia de Insectopia.',NULL,'VISIBLE','2026-11-19 19:29:30','2026-11-19 19:29:30'),(3,3,'[DEMO-035-PUBLICACION-03] libélulas sobre la laguna ficticia. Publicación ficticia de Insectopia.',NULL,'VISIBLE','2026-11-19 19:29:30','2026-11-19 19:29:30'),(4,4,'[DEMO-035-PUBLICACION-04] abejas solitarias entre flores ficticias. Publicación ficticia de Insectopia.',NULL,'VISIBLE','2026-11-19 19:29:30','2026-11-19 19:29:30'),(5,5,'[DEMO-035-PUBLICACION-05] hormigas transportando hojas ficticias. Publicación ficticia de Insectopia.',NULL,'VISIBLE','2026-11-19 19:29:30','2026-11-19 19:29:30'),(6,6,'[DEMO-035-PUBLICACION-06] un saltamontes en la pradera ficticia. Publicación ficticia de Insectopia.',NULL,'VISIBLE','2026-11-19 19:29:30','2026-11-19 19:29:30'),(7,7,'[DEMO-035-PUBLICACION-07] chinches de colores en el muro ficticio. Publicación ficticia de Insectopia.',NULL,'VISIBLE','2026-11-19 19:29:30','2026-11-19 19:29:30'),(8,8,'[DEMO-035-PUBLICACION-08] mariposas nocturnas junto a la linterna ficticia. Publicación ficticia de Insectopia.',NULL,'VISIBLE','2026-11-19 19:29:30','2026-11-19 19:29:30'),(9,9,'[DEMO-035-PUBLICACION-09] una mantis en el invernadero ficticio. Publicación ficticia de Insectopia.',NULL,'VISIBLE','2026-11-19 19:29:30','2026-11-19 19:29:30'),(10,10,'[DEMO-035-PUBLICACION-10] polinizadores en el huerto ficticio. Publicación ficticia de Insectopia.',NULL,'VISIBLE','2026-11-19 19:29:30','2026-11-19 19:29:30'),(11,11,'[DEMO-035-PUBLICACION-11] grillos en la noche ficticia. Publicación ficticia de Insectopia.',NULL,'VISIBLE','2026-11-19 19:29:30','2026-11-19 19:29:30'),(12,12,'[DEMO-035-PUBLICACION-12] un escarabajo rinoceronte en el tronco ficticio. Publicación ficticia de Insectopia.',NULL,'VISIBLE','2026-11-19 19:29:30','2026-11-19 19:29:30'),(13,13,'[DEMO-035-PUBLICACION-13] avispas constructoras de nidos ficticios. Publicación ficticia de Insectopia.',NULL,'VISIBLE','2026-11-19 19:29:30','2026-11-19 19:29:30'),(14,14,'[DEMO-035-PUBLICACION-14] toxorquas en el sendero ficticio. Publicación ficticia de Insectopia.',NULL,'VISIBLE','2026-11-19 19:29:30','2026-11-19 19:29:30'),(15,15,'[DEMO-035-PUBLICACION-15] mariposas migrando sobre el valle ficticio. Publicación ficticia de Insectopia.',NULL,'VISIBLE','2026-11-19 19:29:30','2026-11-19 19:29:30');
/*!40000 ALTER TABLE `publicaciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reacciones`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reacciones` (
  `id_reaccion` bigint NOT NULL AUTO_INCREMENT,
  `id_publicacion` bigint NOT NULL,
  `id_usuario` bigint NOT NULL,
  `tipo` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ME_GUSTA',
  `fecha_reaccion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_reaccion`),
  UNIQUE KEY `uk_reacciones_publicacion_usuario` (`id_publicacion`,`id_usuario`),
  KEY `idx_reacciones_usuario` (`id_usuario`,`fecha_reaccion`),
  CONSTRAINT `fk_reacciones_publicaciones` FOREIGN KEY (`id_publicacion`) REFERENCES `publicaciones` (`id_publicacion`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_reacciones_usuarios` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reacciones`
--

LOCK TABLES `reacciones` WRITE;
/*!40000 ALTER TABLE `reacciones` DISABLE KEYS */;
INSERT INTO `reacciones` VALUES (1,1,1,'ME_GUSTA','2026-11-19 19:29:30'),(2,1,2,'ME_ENCANTA','2026-11-19 19:29:30'),(3,2,3,'ME_GUSTA','2026-11-19 19:29:30'),(4,2,4,'ME_ENCANTA','2026-11-19 19:29:30'),(5,3,5,'ME_GUSTA','2026-11-19 19:29:30'),(6,3,6,'ME_ENCANTA','2026-11-19 19:29:31'),(7,4,7,'ME_GUSTA','2026-11-19 19:29:31'),(8,4,8,'ME_ENCANTA','2026-11-19 19:29:31'),(9,5,9,'ME_GUSTA','2026-11-19 19:29:31'),(10,5,10,'ME_ENCANTA','2026-11-19 19:29:31'),(11,6,11,'ME_GUSTA','2026-11-19 19:29:31'),(12,6,12,'ME_ENCANTA','2026-11-19 19:29:31'),(13,7,13,'ME_GUSTA','2026-11-19 19:29:31'),(14,7,14,'ME_ENCANTA','2026-11-19 19:29:31'),(15,8,15,'ME_GUSTA','2026-11-19 19:29:31'),(16,8,1,'ME_ENCANTA','2026-11-19 19:29:31'),(17,9,2,'ME_GUSTA','2026-11-19 19:29:31'),(18,9,3,'ME_ENCANTA','2026-11-19 19:29:31'),(19,10,4,'ME_GUSTA','2026-11-19 19:29:31'),(20,10,5,'ME_ENCANTA','2026-11-19 19:29:31'),(21,11,6,'ME_GUSTA','2026-11-19 19:29:31'),(22,11,7,'ME_ENCANTA','2026-11-19 19:29:31'),(23,12,8,'ME_GUSTA','2026-11-19 19:29:31'),(24,12,9,'ME_ENCANTA','2026-11-19 19:29:31'),(25,13,10,'ME_GUSTA','2026-11-19 19:29:31'),(26,13,11,'ME_ENCANTA','2026-11-19 19:29:31'),(27,14,12,'ME_GUSTA','2026-11-19 19:29:31'),(28,14,13,'ME_ENCANTA','2026-11-19 19:29:31'),(29,15,14,'ME_GUSTA','2026-11-19 19:29:31'),(30,15,15,'ME_ENCANTA','2026-11-19 19:29:31');
/*!40000 ALTER TABLE `reacciones` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `reportes`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `reportes` (
  `id_reporte` bigint NOT NULL AUTO_INCREMENT,
  `id_reportante` bigint NOT NULL,
  `id_publicacion` bigint NOT NULL,
  `id_moderador` bigint DEFAULT NULL,
  `motivo` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('PENDIENTE','EN_REVISION','RESUELTO','RECHAZADO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'PENDIENTE',
  `resolucion` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `fecha_reporte` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_resolucion` datetime DEFAULT NULL,
  PRIMARY KEY (`id_reporte`),
  KEY `idx_reportes_estado_fecha` (`estado`,`fecha_reporte`),
  KEY `idx_reportes_publicacion` (`id_publicacion`,`fecha_reporte`),
  KEY `idx_reportes_reportante` (`id_reportante`,`fecha_reporte`),
  KEY `fk_reportes_moderador` (`id_moderador`),
  CONSTRAINT `fk_reportes_moderador` FOREIGN KEY (`id_moderador`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_reportes_publicacion` FOREIGN KEY (`id_publicacion`) REFERENCES `publicaciones` (`id_publicacion`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `fk_reportes_reportante` FOREIGN KEY (`id_reportante`) REFERENCES `usuarios` (`id_usuario`) ON DELETE RESTRICT ON UPDATE RESTRICT
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `reportes`
--

LOCK TABLES `reportes` WRITE;
/*!40000 ALTER TABLE `reportes` DISABLE KEYS */;
INSERT INTO `reportes` VALUES (1,1,1,NULL,'Contenido inapropiado de demostración','[DEMO-038-REPORTE-01] Reporte ficticio de demostración.','PENDIENTE',NULL,'2026-11-09 19:29:32',NULL),(2,2,2,NULL,'Datos ficticios confusos','[DEMO-038-REPORTE-02] Reporte ficticio de demostración.','EN_REVISION',NULL,'2026-11-10 19:29:32',NULL),(3,3,3,2,'Spam de demostración','[DEMO-038-REPORTE-03] Reporte ficticio de demostración.','RESUELTO','Resolución ficticia de demostración.','2026-11-11 19:29:32','2026-11-12 19:29:32'),(4,4,4,2,'Imagen no relacionada con insectos','[DEMO-038-REPORTE-04] Reporte ficticio de demostración.','RECHAZADO','Resolución ficticia de demostración.','2026-11-12 19:29:32','2026-11-13 19:29:32'),(5,5,5,NULL,'Lenguaje ofensivo de demostración','[DEMO-038-REPORTE-05] Reporte ficticio de demostración.','PENDIENTE',NULL,'2026-11-13 19:29:32',NULL),(6,6,6,NULL,'Contenido inapropiado de demostración','[DEMO-038-REPORTE-06] Reporte ficticio de demostración.','EN_REVISION',NULL,'2026-11-14 19:29:32',NULL),(7,7,7,2,'Datos ficticios confusos','[DEMO-038-REPORTE-07] Reporte ficticio de demostración.','RESUELTO','Resolución ficticia de demostración.','2026-11-15 19:29:32','2026-11-16 19:29:32'),(8,8,8,2,'Spam de demostración','[DEMO-038-REPORTE-08] Reporte ficticio de demostración.','RECHAZADO','Resolución ficticia de demostración.','2026-11-16 19:29:32','2026-11-17 19:29:32'),(9,9,9,NULL,'Imagen no relacionada con insectos','[DEMO-038-REPORTE-09] Reporte ficticio de demostración.','PENDIENTE',NULL,'2026-11-17 19:29:32',NULL),(10,10,10,NULL,'Lenguaje ofensivo de demostración','[DEMO-038-REPORTE-10] Reporte ficticio de demostración.','EN_REVISION',NULL,'2026-11-18 19:29:32',NULL),(11,11,11,2,'Contenido inapropiado de demostración','[DEMO-038-REPORTE-11] Reporte ficticio de demostración.','RESUELTO','Resolución ficticia de demostración.','2026-11-19 19:29:32','2026-11-20 19:29:32'),(12,12,12,2,'Datos ficticios confusos','[DEMO-038-REPORTE-12] Reporte ficticio de demostración.','RECHAZADO','Resolución ficticia de demostración.','2026-11-20 19:29:32','2026-11-21 19:29:32'),(13,13,13,NULL,'Spam de demostración','[DEMO-038-REPORTE-13] Reporte ficticio de demostración.','PENDIENTE',NULL,'2026-11-21 19:29:32',NULL),(14,14,14,NULL,'Imagen no relacionada con insectos','[DEMO-038-REPORTE-14] Reporte ficticio de demostración.','EN_REVISION',NULL,'2026-11-22 19:29:32',NULL),(15,15,15,2,'Lenguaje ofensivo de demostración','[DEMO-038-REPORTE-15] Reporte ficticio de demostración.','RESUELTO','Resolución ficticia de demostración.','2026-11-23 19:29:32','2026-11-24 19:29:32');
/*!40000 ALTER TABLE `reportes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id_rol` bigint NOT NULL AUTO_INCREMENT,
  `nombre` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `descripcion` varchar(255) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  PRIMARY KEY (`id_rol`),
  UNIQUE KEY `uk_roles_nombre` (`nombre`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'ADMINISTRADOR','Gestion total de la plataforma'),(2,'MODERADOR','Aprobacion de eventos y gestion de reportes'),(3,'USUARIO','Funciones generales de la red social');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `seguidores`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `seguidores` (
  `id_seguidor` bigint NOT NULL,
  `id_seguido` bigint NOT NULL,
  `fecha_seguimiento` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_seguidor`,`id_seguido`),
  KEY `idx_seguidores_id_seguido` (`id_seguido`),
  CONSTRAINT `fk_seguidores_usuario_seguido` FOREIGN KEY (`id_seguido`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `fk_seguidores_usuario_seguidor` FOREIGN KEY (`id_seguidor`) REFERENCES `usuarios` (`id_usuario`),
  CONSTRAINT `chk_seguidores_no_auto_seguimiento` CHECK ((`id_seguidor` <> `id_seguido`))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `seguidores`
--

LOCK TABLES `seguidores` WRITE;
/*!40000 ALTER TABLE `seguidores` DISABLE KEYS */;
INSERT INTO `seguidores` VALUES (1,6,'2026-10-30 19:29:32'),(1,9,'2026-11-14 19:29:32'),(2,7,'2026-10-31 19:29:32'),(2,10,'2026-11-15 19:29:32'),(3,8,'2026-11-01 19:29:32'),(3,11,'2026-11-16 19:29:32'),(4,9,'2026-11-02 19:29:32'),(4,12,'2026-11-17 19:29:32'),(5,10,'2026-11-03 19:29:32'),(5,13,'2026-11-18 19:29:32'),(6,11,'2026-11-04 19:29:32'),(7,12,'2026-11-05 19:29:32'),(8,13,'2026-11-06 19:29:32'),(9,14,'2026-11-07 19:29:32'),(10,15,'2026-11-08 19:29:32'),(11,1,'2026-11-09 19:29:32'),(12,2,'2026-11-10 19:29:32'),(13,3,'2026-11-11 19:29:32'),(14,4,'2026-11-12 19:29:32'),(15,5,'2026-11-13 19:29:32');
/*!40000 ALTER TABLE `seguidores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tokens_recuperacion`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens_recuperacion` (
  `id_token` bigint NOT NULL AUTO_INCREMENT,
  `id_usuario` bigint NOT NULL,
  `token_hash` char(64) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_creacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_expiracion` datetime NOT NULL,
  `fecha_uso` datetime DEFAULT NULL,
  PRIMARY KEY (`id_token`),
  UNIQUE KEY `uk_tokens_recuperacion_hash` (`token_hash`),
  KEY `idx_tokens_recuperacion_usuario` (`id_usuario`,`fecha_expiracion`),
  KEY `idx_tokens_recuperacion_expiracion` (`fecha_expiracion`),
  CONSTRAINT `fk_tokens_recuperacion_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tokens_recuperacion`
--

LOCK TABLES `tokens_recuperacion` WRITE;
/*!40000 ALTER TABLE `tokens_recuperacion` DISABLE KEYS */;
/*!40000 ALTER TABLE `tokens_recuperacion` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tokens_revocados`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tokens_revocados` (
  `jti` char(36) COLLATE utf8mb4_unicode_ci NOT NULL,
  `id_usuario` bigint NOT NULL,
  `fecha_revocacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_expiracion` datetime NOT NULL,
  PRIMARY KEY (`jti`),
  KEY `idx_tokens_revocados_usuario` (`id_usuario`,`fecha_expiracion`),
  KEY `idx_tokens_revocados_expiracion` (`fecha_expiracion`),
  CONSTRAINT `fk_tokens_revocados_usuario` FOREIGN KEY (`id_usuario`) REFERENCES `usuarios` (`id_usuario`) ON DELETE CASCADE ON UPDATE RESTRICT
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tokens_revocados`
--

LOCK TABLES `tokens_revocados` WRITE;
/*!40000 ALTER TABLE `tokens_revocados` DISABLE KEYS */;
/*!40000 ALTER TABLE `tokens_revocados` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `usuarios`
--

/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `usuarios` (
  `id_usuario` bigint NOT NULL AUTO_INCREMENT,
  `id_rol` bigint NOT NULL,
  `nombre` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `nombre_usuario` varchar(30) COLLATE utf8mb4_unicode_ci NOT NULL,
  `correo` varchar(150) COLLATE utf8mb4_unicode_ci NOT NULL,
  `contrasena` varchar(255) COLLATE utf8mb4_unicode_ci NOT NULL,
  `fecha_nacimiento` date NOT NULL,
  `genero` varchar(30) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `pais_codigo` char(2) COLLATE utf8mb4_unicode_ci NOT NULL,
  `estado_region` varchar(100) COLLATE utf8mb4_unicode_ci NOT NULL,
  `telefono` varchar(20) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `biografia` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `foto_perfil` varchar(500) COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `estado` enum('ACTIVO','BLOQUEADO','DESACTIVADO') COLLATE utf8mb4_unicode_ci NOT NULL DEFAULT 'ACTIVO',
  `recibir_sms` tinyint(1) NOT NULL DEFAULT '0',
  `recibir_whatsapp` tinyint(1) NOT NULL DEFAULT '0',
  `version_token` int NOT NULL DEFAULT '0',
  `fecha_registro` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `fecha_actualizacion` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id_usuario`),
  UNIQUE KEY `uk_usuarios_nombre_usuario` (`nombre_usuario`),
  UNIQUE KEY `uk_usuarios_correo` (`correo`),
  KEY `idx_usuarios_id_rol` (`id_rol`),
  KEY `idx_usuarios_estado_fecha` (`estado`,`fecha_registro`),
  CONSTRAINT `fk_usuarios_roles` FOREIGN KEY (`id_rol`) REFERENCES `roles` (`id_rol`) ON DELETE RESTRICT ON UPDATE RESTRICT,
  CONSTRAINT `chk_usuarios_version_token` CHECK ((`version_token` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `usuarios`
--

LOCK TABLES `usuarios` WRITE;
/*!40000 ALTER TABLE `usuarios` DISABLE KEYS */;
INSERT INTO `usuarios` VALUES (1,1,'Demo Marina Vega','demo.marina.vega','demo.marina.vega@insectopia.invalid','$2a$10$60TaD5gnAGUiFZBfHy4nmuCKLNiCweJrMvLEwnwRiUbjrLsCRsXMa','1990-04-12',NULL,'ES','Madrid','+34600000001','Administradora ficticia del ecosistema de demostración.',NULL,'ACTIVO',0,0,0,'2026-11-19 19:29:28','2026-11-19 19:29:28'),(2,2,'Demo Iker Salas','demo.iker.salas','demo.iker.salas@insectopia.invalid','$2a$10$GXK78MHXx5pAgo.z8U4JLOZhEx7HdmiwJ7YPtdbyaW557vPu9UwtC','1988-09-03',NULL,'ES','Madrid','+34600000002','Moderador ficticio de eventos y reportes de insectos.',NULL,'ACTIVO',0,0,0,'2026-11-19 19:29:28','2026-11-19 19:29:28'),(3,2,'Demo Lucia Ferrer','demo.lucia.ferrer','demo.lucia.ferrer@insectopia.invalid','$2a$10$v4kuH4xA2jfPM2l4mvWTg.0RuwtU6ao5vS1SALtvdI2zDz5ZnlDCO','1995-02-21',NULL,'ES','Valencia','+34600000003','Moderadora ficticia dedicada a la observación de mariposas.',NULL,'ACTIVO',0,0,0,'2026-11-19 19:29:28','2026-11-19 19:29:28'),(4,3,'Demo Andres Mora','demo.andres.mora','demo.andres.mora@insectopia.invalid','$2a$10$6HrZNhzgj7xYLc9S8eJzC.R66dgysNNfzN7n1IQhkATMUTR8pVR96','1992-07-08',NULL,'ES','Sevilla','+34600000004','Aficionado ficticio a los escarabajos del bosque.',NULL,'ACTIVO',0,0,0,'2026-11-19 19:29:29','2026-11-19 19:29:29'),(5,3,'Demo Clara Rios','demo.clara.rios','demo.clara.rios@insectopia.invalid','$2a$10$9TuvHOrYylsmiTj/mInVxuHa8rHaCwgq67maPkxfF9n5nv5ISLhta','1998-11-16',NULL,'ES','Madrid','+34600000005','Observadora ficticia de libélulas en humedales.',NULL,'ACTIVO',0,0,0,'2026-11-19 19:29:29','2026-11-19 19:29:29'),(6,3,'Demo Bruno Gil','demo.bruno.gil','demo.bruno.gil@insectopia.invalid','$2a$10$PQCn/3VtODW8dYriHYIPIeMR8FExMuaIGPRrmiWO7slDqTWxNzea.','1987-03-04',NULL,'ES','Barcelona','+34600000006','Explorador ficticio de hormigas y sus caminos.',NULL,'ACTIVO',0,0,0,'2026-11-19 19:29:29','2026-11-19 19:29:29'),(7,3,'Demo Elena Pardo','demo.elena.pardo','demo.elena.pardo@insectopia.invalid','$2a$10$qnAMEEfhKrV1T.YvaQIAJu/xFmg7dE8yGK8Gtic9IH6tbLDw7gOvi','1993-06-27',NULL,'ES','Madrid','+34600000007','Naturalista ficticia interesada en las abejas solitarias.',NULL,'ACTIVO',0,0,0,'2026-11-19 19:29:29','2026-11-19 19:29:29'),(8,3,'Demo Hector Ruiz','demo.hector.ruiz','demo.hector.ruiz@insectopia.invalid','$2a$10$A8re0Zn1LTsr5z3bjDadXeW7FvR6/F26ufqPzV/m6FPE.B/L5Bqgi','1991-01-30',NULL,'ES','Valencia','+34600000008','Fotógrafo ficticio de chinches y coloridos coleópteros.',NULL,'ACTIVO',0,0,0,'2026-11-19 19:29:29','2026-11-19 19:29:29'),(9,3,'Demo Nora Vidal','demo.nora.vidal','demo.nora.vidal@insectopia.invalid','$2a$10$zuK4bq6HUHt5ECKpUBZK0eEx3JSFvDKTrzYQfXdnHukFk.nC4G142','2001-08-19',NULL,'ES','Madrid','+34600000009','Estudiante ficticia de metamorfosis de insectos.',NULL,'ACTIVO',0,0,0,'2026-11-19 19:29:29','2026-11-19 19:29:29'),(10,3,'Demo Oscar Lemos','demo.oscar.lemos','demo.oscar.lemos@insectopia.invalid','$2a$10$gmIb/ZCqG/aBXzCePHCeQOZQNnKRuUiu7dlte.Q9PuncjblUcRDUK','1985-12-05',NULL,'ES','Galicia','+34600000010','Cuidador ficticio de un jardín de mariposas.',NULL,'ACTIVO',0,0,0,'2026-11-19 19:29:29','2026-11-19 19:29:29'),(11,3,'Demo Sara Quintero','demo.sara.quintero','demo.sara.quintero@insectopia.invalid','$2a$10$81lDG1jdPUzvn2y9VLJImOGieQTMlgTzGkhOu7E4Z7j15ttViuxc.','1996-05-14',NULL,'ES','Madrid','+34600000011','Investigadora ficticia de grasas y flores silvestres.',NULL,'ACTIVO',0,0,0,'2026-11-19 19:29:29','2026-11-19 19:29:29'),(12,3,'Demo Mateo Cano','demo.mateo.cano','demo.mateo.cano@insectopia.invalid','$2a$10$aRuw.yViIrdhEHwRo/LMZOO8nPzXZiYap8ymD9EiGnu8EvrqqTR32','1994-10-02',NULL,'ES','Madrid','+34600000012','Excursionista ficticio que cataloga saltamontes.',NULL,'ACTIVO',0,0,0,'2026-11-19 19:29:30','2026-11-19 19:29:30'),(13,3,'Demo Iris Beltran','demo.iris.beltran','demo.iris.beltran@insectopia.invalid','$2a$10$.v.aqMT2XH/drfds1ZxHpO4.WkGFd4jV3IEiNJkNKJ3kdjdAgEpz2','1999-07-23',NULL,'ES','Madrid','+34600000013','Ilustradora ficticia de insectos de la Luna de Miel.',NULL,'ACTIVO',0,0,0,'2026-11-19 19:29:30','2026-11-19 19:29:30'),(14,3,'Demo Pablo Cedeno','demo.pablo.cedeno','demo.pablo.cedeno@insectopia.invalid','$2a$10$5jTyFHzF0oWBVtqzf5CJbuSGfzmd8hM0TxWFwwQ6tNwNqedOEZdTe','1989-11-11',NULL,'ES','Madrid','+34600000014','Guía ficticio de rutas de observación nocturna.',NULL,'ACTIVO',0,0,0,'2026-11-19 19:29:30','2026-11-19 19:29:30'),(15,3,'Demo Alma Trujillo','demo.alma.trujillo','demo.alma.trujillo@insectopia.invalid','$2a$10$BtzHolgIL04UndcNEZ0MAunfREnTuP0e9X4JrDfcmj50KFNi1kDMS','1997-04-06',NULL,'ES','Madrid','+34600000015','Divulgadora ficticia sobre polinización y biodiversidad.',NULL,'ACTIVO',0,0,0,'2026-11-19 19:29:30','2026-11-19 19:29:30');
/*!40000 ALTER TABLE `usuarios` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping routines for database 'insectopia_modelo_nuevo'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-11-19 20:03:55
