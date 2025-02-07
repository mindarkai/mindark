## Backlog

- MindArk - An ecosystem and framework for building, deploying and consuming AI powered applications and experiences. MindArk applications are a collection composable packages.


- MindArk Deployment Types
  - Pro - (mindark.ai) A fully managed version of MindArk for individuals and small teams where users self sign-up and create and share Echos
  - Enterprise Managed - A full managed version MindArk deployed to AWS with a custom domain or MindArk sub-domain.
  - Enterprise Local - MindArk deployed on dedicated hardware on a client's network with enterprise support staff
  - Self Hosted - MindArk self hosted with option to proxy compute intensive packages. The UI of the self hosted version of MindArk uses a community version of the MindArk design system. Premium styling, branding and builder interfaces is reserved for paying customers.
  - Embedded - MindArk packages such as Echos embedded into other websites

- Focused Landing Pages - Landing pages that are focused on a vertical or specific user base. The landing page will describe how it benefits the target user base and provide a starting template for an Echo that addresses their needs.

- Landing Page - **Need Group Input**
  - Migrate existing `est 2d iv`  - Migrate existing novo app index page

- Dashboard - **Need Group Input** - An interface where users can search for Echos and see featured Echos

- On-boarding - **Need Group Input** - A guided user onboarding flow to help the user create their first Echo


- Subscription Management - Users can pay for a monthly or annual  subscription
  - Stripe integration `est 3w`

- MindArk Design System
  - MindArk Design System Spec `est 0`
    - Color Pallet - Primary Color, Secondary Color, Border Color, ect
    - Typography
    - ect
  - IYIO Integration `est 3d` - The MindArk Design system can be used with the IYIO Base Layout framework
  - Tailwind Integration `est 3d` - The MindArk Design system can be used in Tailwinds

- Ark Package - A single resource or collection of resources. Ark Packages are the generic building blocks in the MarkArk ecosystem. All packages define a type and that type is used to identity the functionality and requirements of the package. Packages live on the VFS (virtual file system) and can exist across multiple physical machines.
  - Base Controller Class -  The ArkPackageCtrl class is the base class that all other package controllers extend. ArkPackageCtrl defines all life cycle methods that allow extending classes to respond to runtime events.
    - Implementation `est 4d nt`  - A developer can extends the ArkPackageCtrl to create a new package controller that can interact with the Ark Runtime

- Package Proxy `est 1w iv`  - A representation of a package in the local runtime that proxies messages to a remote package running in a remote runtime.

- Echo - An Ark Module that is a representation / reverberation of a person, place or thing. Echos are used to model entities in digital representations of real world systems.

  - Echo Chamber - Loads an Echo file and display an interface for interacting with the echo
    - Migrate Existing channel page `est 3d iv` 

  - Advanced Builder - `iv` An interface for building Echos intended for use by semi-technical end users. The builder exposes all properties of an Echo as a web form
    - Interface Design `est 3d` - User sees a preview of an Echo with property panels to the sides for editing the echo
    - Previewer `est 1d` - User can see a live preview of the Echo as they make changes
    - Form inputs `est 2d` - User can modify all properties of an Echo using form inputs
    - Raw Convo `est 1d` - User can add raw Convo-Lang to an Echo
    
  - Fluid Builder - Users are guided down a step-by-step minimalist interface where they are asked questions to collect data for creating a self representative Echo 
    - Interface Design `est 1w`
    - Implementation `est 1w`
    
  - Echo Interview - Users record interview videos in response to a topic. The interface shows the user's video on one side of the screen and questions to respond to on the other side of the screen
    - Interface Design `est 1w`
    - Implementation `est 1w`

- EachID `est 1d` - The combination of an Echo's unique ID, file hash and URL that allow an Echo to be uniquely identified, verified and located.

- Ark Identity Management - `v-iv` System used to allow single sign-on across all of MindArk
  - Keycloak theme `est 2d` - User sees a MindArk theme sign-in page when signing in or registering 
  - Keycloak integration `est 3d`
  - Keycloak Sign-in bug `est 1d`

- Ark Repo - A repository of MindArk packages. Users can either use the official MindArk repo or deploy their own. See https://www.npmjs.com/ for design inspiration.
  - Package Publishing `est 3d` - A user can publish a package as a downloadable and shareable file. The published version of the package will be listed as a tagged version of the package on the packages detail screen.
  - Landing Page - A user can search for packages and see a list of popular packages
    - Interface Design - `est 2d`
    - Implementation - `est 2d`
  - Search Result Page - User can see a list of package matching their search
    - Interface Design - `est 1d`
    - Implementation - `est 1d`
  - Package Detail Page - User can see detailed information about a package with options to download, open, clone or browse files. The page will also display the formatted README.md file of the package. This page is similar to the landing package of a GitHub repo.
    - Interface Design - `est 1w`
    - Implementation - `est 2w`
  - Publisher Profile Page - Users can see information about a publisher and the packages they have published. If the profile page belongs to the user the user can edit profile information
    - Interface Design - `est 2d`
    - Implementation - `est 3d`

- Proof - A smart contract that stores references to Ark packages on a blockchain. References in the Proof block chain consist of EchoIDs which are Ark Package IDs, file hashes, URLs and additional metadata. This combination of package attributes allow Ark Packages to identified, verified and located using a block chain.
  - Ethereum Implementation `est 4w` - A user can create a package reference stored in the Ethereum blockchain
  - Ethereum Deployment `est 1w` - A user can use Proof on the Ethereum mainnet. This may cost a few thousand dollars.

- Ark Runtime `est 1w nt`  - A runtime environment that facilitates the loading, execution and hosting of Ark Packages and Echos.
  - Base - Provides access to a Ark Runtime with the ability to load and run packages
    - Package Loading `est 2d nt`  - Runtime can load a package and child packages from the VFS
    - Package Archiving `est 2d v-iv`  - Runtime can archive a package as a single file and save the file to the VFS with the .arkp or .echo extension
  - WebUI - Access to a web browser for rendering user interfaces.
  - Backend - Environment for running backend workloads
    

- Orchestrator - Manages the deployment of Ark Runtimes.
  - Podman Integration `est 1w` - Runtimes can be deployed to containers using Podman
  - Kubernetes Integration `est 3w` - Runtimes can be deployed to a Kubernetes cluster

- Lattice - A network of connected Ark Runtimes and a lookup service (Mind Map) facilitate finding packages on the Lattice.

- Mind Map `est 1w` - A lookup service that maps package ids and package tags names to fully qualified package URLs.

- Pulse - A process or workflow that runs in response to a specific event or schedule. The execution of a Pulse is typically short lived, but can executed at regular intervals to create the hart beat of a long running task. Pulses are implemented using ConvoGraph.
  - Convo Graph Integration `est 1w`
  - Scheduler - A user can schedule a Pulse to run at a set interval or based on a CRON schedule
    - Interface Design `est 2d`
    - Implementation `est 4d`
  - Event Listener - A user can select a Pulse to run based on a runtime event
    - Interface Design `est 2d`
    - Implementation `est 2d`

- Ark API - A standard set of messages defined for each of the standard package types in MindArk.

- VFS - A virtual file system used to store Ark Packages and other documents and resources. The VFS also tracks resources permissions in Unix like fashion.
  - VFS Permissions System `est 1w` - Files in the VFS can have their permissions tied to users and user groups in the Ark Identity Management system
  - Python VFS `est 2w` - Python can read and write VFS files

- File Manager Interface - A file browsing interface user can use to manage files

- Ark Message Protocol (AMP) - A protocol that defines how messages are sent between Ark Packages. The Ark Message Protocol is for all inter package communication even if the communicating packages are running in the same process / memory space. By forcing the usages of AMP for all package communication it ensure that packages can be ran in the same runtime or across multiple runtimes with no change in design. Each Ark message has a unique ID, sender ID and receiver ID and can represent a request, response or broadcast. receiver IDs can either be a single package or a broadcast to all packages within a module.
  - AMP Transports - The various transport mediums use to send and receive Ark Messages
    - HTTP - Messages sent over HTTP
    - stdio `est 3d` - used to send messages between processes where a parent process spawns a child process
    - Human Chat - Use to send messages in a human chat interface such as Slack, WhatsApp or SMS.
      - Slack Integration `est 0`
      - WhatsApp Integration `est 0`
      - Twilio SMS Integration `est 0`

- Knowledge Query - A query that spans 1 or more packages. A knowledge query has a requester and the requesters role and permissions will determine the knowledge return from each package. A knowledge query can be directly used by a user or used as a RAG source.
  - Message Structure `est 1d` - Defines the request and response structured of a Knowledge Query and includes a query value to search information for and an optional prompt that the responder of the query should execute.
  - Query execution - `est 1w` - A knowledge query can be can be sent to a package and the package and all of its decedents will respond to the query. The target package can be a single package running in a runtime or a lattice package (network) containing may other packages and Echos.
  - Deep Search Interface - An interface for end user to directly execution knowledge queries
    - Interface Design - `est 2d`
    - Implementation - `est 2d`

- ConvoLang - The language used by Echos

- Standard Package Types
  - Document Index - A database that stores embeddings and corresponding text chucks for documents. Document indexes can search for text chunks based on similarity to a given embedding.
    - SQLite Index `est 3d v-iv` - SQLite can be used as a document index
  - Inference - Runs inference for Convo script. Inference packages are responsible for converting Convo into the native prompt format of their target LLM.
    - OpenAI `est 1d v-iv`  - Inference can be ran using the OpenAI api.
    - Claude `est 3d` - Inference can be ran using the Claude api.
    - Gemini `est 3d` - Inference can be ran using the Gemini api.
    - Llama Bedrock `est 1w` - Inference can be ran using Llama running in Bedrock.
    - Llama local `est 1w` - Inference can be ran in a container using Llama and llama.cpp.
    - R1 local `est 1w` - Inference can be ran in a container using R1 and llama.cpp.
  - Covo - A collection of Convo-Lang scripts
  - Embeddings - Generates embeddings based on given text or a file on the VFS.
  - VFS HTTP Access Point - Exposes a path on the VFS to HTTP requests (internet access)
    - Redirect Map `est 1d iv`  - A package can define a set of redirect patterns to redirect requests. Used to implement dynamic routes in statically hosted web apps.
    - GET Requests `est 2d iv`  - A file on the VFS can be returned based on the path of a GET request
    - Domain Name Assignment `est 2d iv`  - A domain name can be assigned to an access point.
    - SSL `est 2d iv` - An SSL certificate can be issued to an access point
  - Interface - Contains files for user interfaces
    - NextJS static site `est 2d iv`  - A NextJS site can be built and hosted as a static site
  
  
  - Markdown Converter - Converts documents and files to Markdown. (note - pages are separated using horizontal rules `---`)
    - Office document conversion `est 3d` - User can convert any Office document into markdown - https://github.com/microsoft/markitdown
  - Markdown Splitter `est 1d iv`  - Splits markdown into text chunks at various resolutions
  - Transcriber Package - Transcribes audio and video files with word level timing information
    - Whisper OpenAI `est 1d iv`  - Audio can be transcribe using the OpenAI hosted version of Whisper
    - WhisperX Local `est 2d` - Audio can be transcribe using a local version of whisper
  - TTS - Converts text to audio
    - OpenAI TTS `est 1d iv`  - Text can be converted to audio using the OpenAI api
  - Image Generation - Generates images based on a prompt
    - DallE `est 1d iv`  - Images can be generated using the OpenAI api
  - Echo
  - Runtime
  - Lattice
  - Container Base - Base package for packages running in a container
  - Web Browser - Full access to a web browser that can be controlled programmatically
  - Shell - Full access to a Unix shell that can be controlled programmatically
  - Computer - Full access to a desktop computer that can be controlled programmatically
