## Development Tips

- The code is organised domain wise. All related resources for a domain are kept in a folder under `src/<domain-name>`.
- Inside `src/<domain-name>` folder, you will find `model`, `queue`, `routes`, `services`, `utils` folders/files.
- `model` contains the mongoose models for the domain.
- `queue` contains the bullmq queues for the domain.
- `worker` contains the bullmq workers for the domain.
- `routes` contains the express routes for the domain.
- `services` contains the services for the domain.
- `utils` contains the utils for the domain.
