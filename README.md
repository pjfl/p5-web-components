<div>
    <a href="https://roxsoft.co.uk/coverage/report/web-components/latest"><img src="https://roxsoft.co.uk/coverage/badge/web-components/latest" alt="Coverage Badge"></a>
    <a href="http://badge.fury.io/pl/Web-Components"><img src="https://badge.fury.io/pl/Web-Components.svg" alt="CPAN Badge"></a>
    <a href="http://cpants.cpanauthors.org/dist/Web-Components"><img src="http://cpants.cpanauthors.org/dist/Web-Components.png" alt="Kwalitee Badge"></a>
</div>

# Name

Web::Components - MVC pattern for Web::Simple

# Synopsis

    package Component::Server;

    use Plack::Builder;
    use Web::Simple;

    with 'Web::Components::Loader';

# Description

MVC pattern for Web::Simple. See [Web::Components::Loader](https://metacpan.org/pod/Web%3A%3AComponents%3A%3ALoader)

# Configuration and Environment

Defines no attributes

# Subroutines/Methods

Defines no methods

# Diagnostics

None

# Dependencies

- [Exporter::Tiny](https://metacpan.org/pod/Exporter%3A%3ATiny)
- [HTTP::Message](https://metacpan.org/pod/HTTP%3A%3AMessage)
- [Module::Pluggable](https://metacpan.org/pod/Module%3A%3APluggable)
- [Moo](https://metacpan.org/pod/Moo)
- [Try::Tiny](https://metacpan.org/pod/Try%3A%3ATiny)
- [Unexpected](https://metacpan.org/pod/Unexpected)
- [Web::ComposableRequest](https://metacpan.org/pod/Web%3A%3AComposableRequest)
- [Web::Simple](https://metacpan.org/pod/Web%3A%3ASimple)

# Incompatibilities

There are no known incompatibilities in this module

# Bugs and Limitations

There are no known bugs in this module. Please report problems to
http://rt.cpan.org/NoAuth/Bugs.html?Dist=Web-Components.
Patches are welcome

# Acknowledgements

Larry Wall - For the Perl programming language

# Author

Peter Flanigan, `<pjfl@cpan.org>`

# License and Copyright

Copyright (c) 2017 Peter Flanigan. All rights reserved

This program is free software; you can redistribute it and/or modify it
under the same terms as Perl itself. See [perlartistic](https://metacpan.org/pod/perlartistic)

This program is distributed in the hope that it will be useful,
but WITHOUT WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE
