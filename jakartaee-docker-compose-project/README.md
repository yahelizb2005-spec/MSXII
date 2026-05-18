# MS XII Music

Aplicacion Jakarta EE sencilla para gestionar usuarios, administradores, canciones y albumes desde el navegador.

## Tecnologias

- HTML, CSS y JavaScript para la interfaz.
- Java Servlet para mantener el proyecto Jakarta EE.
- Docker y Tomcat para ejecutar la aplicacion.

## Arrancar

```bash
docker compose up --build
```

Luego abre:

```text
http://localhost:8080
```

## Estructura principal

```text
src/main/webapp/       Paginas, estilos, imagenes y JavaScript
src/main/java/         Servlet Java minimo
Dockerfile             Imagen de Tomcat
docker-compose.yml     Servicio de la app
pom.xml                Configuracion Maven
```
