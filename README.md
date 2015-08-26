# Name

Web::Components - MVC pattern for Web::Simple

# Synopsis

    package Component::Server;

    use Class::Usul;
    use Moo;

    has '_usul' => is => 'lazy', builder => sub {
       Class::Usul->new( config => { appclass => __PACKAGE__  } ) },
       handles  => [ 'config', 'debug', 'l10n', 'lock', 'log' ];

    with 'Web::Components::Loader';

# Description

MVC pattern for Web::Simple. See [Web::Components::Loader](https://metacpan.org/pod/Web::Components::Loader)

# Configuration and Environment

Defines no attributes

# Subroutines/Methods

Defines no methods

# Diagnostics

None

# Dependencies

- [Exporter::Tiny](https://metacpan.org/pod/Exporter::Tiny)
- [HTTP::Message](https://metacpan.org/pod/HTTP::Message)
- [Module::Pluggable](https://metacpan.org/pod/Module::Pluggable)
- [Moo](https://metacpan.org/pod/Moo)
- [Try::Tiny](https://metacpan.org/pod/Try::Tiny)
- [Unexpected](https://metacpan.org/pod/Unexpected)
- [Web::ComposableRequest](https://metacpan.org/pod/Web::ComposableRequest)
- [Web::Simple](https://metacpan.org/pod/Web::Simple)

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

Copyright (c) 2015 Peter Flanigan. All rights reserved

This program is free software; you can redistribute it and/or modify it
under the same terms as Perl itself. See [perlartistic](https://metacpan.org/pod/perlartistic)

This program is distributed in the hope that it will be useful,
but WITHOUT WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE
