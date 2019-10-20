docker ps | cut -d " " -f 1 | tail -n 1 | xargs docker kill
