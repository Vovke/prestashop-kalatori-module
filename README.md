# Development

Install dependencies:

```
composer install
```

Create docker network (do once)

```
docker network create kalatori-network
```

Spawn environment

```
cd docker
docker compose up prestashop --force-recreate
```

The module will be installed automatically, yet you will have to enable and configure it. You can access to PrestaShop in your browser:

- http://localhost:8888
- http://localhost:8888/admin-dev/ (back office, login: admin@prestashop.com password: prestashop)

To develop against locally running daemon, use Kalatori daemon's [docker compose](https://github.com/Alzymologist/Kalatori-backend/blob/main/tests/docker-compose.yml) (you will need to fetch project locally)

daemon's url will be `http://kalatori-daemon:16726` in that case
