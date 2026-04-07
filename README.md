# ValoMapper

ValoMapper is a collaborative strategy tool for VALORANT. Place agents, abilities, and utility icons on interactive maps, annotate with free-hand drawing and text, and plan with your team in real time. Inspired heavily by the design and ideas of [Valoplant](https://valoplant.gg) and [Icarus](https://github.com/SunkenInTime/icarus).

The frontend is built with Next.js and the backend is a Go REST API backed by PostgreSQL. Real-time collaboration is powered by WebSockets. Firebase handles authentication, Riot Sign-On (RSO) supports Riot account login, Stripe manages subscription billing, and Tigris provides S3-compatible object storage for image uploads.

## Prerequisites

- Node.js & npm
- Go
- PostgreSQL
- A Firebase project with backend credentials for Firebase Admin

## Getting Started

See the component READMEs for full setup instructions:

- [Frontend (valo-mapper)](valo-mapper/README.md)
- [Backend (valo-mapper-api)](valo-mapper-api/README.md)

## Deployment

ValoMapper is deployed on Fly.io. See [docs/deployment.md](docs/deployment.md).

## Contributing

Pull requests are welcome. For major changes, please open an issue first to discuss what you would like to change.

## License

This project is licensed under the MIT License.

## Support

If you find ValoMapper useful, consider supporting development on [Ko-fi](https://ko-fi.com/5h4fin).
