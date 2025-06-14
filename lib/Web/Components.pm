package Web::Components;

use 5.010001;
use strictures;
use version; our $VERSION = qv( sprintf '0.13.%d', q$Rev: 2 $ =~ /\d+/gmx );

1;

__END__

=pod

=encoding utf-8

=begin html

<a href="https://roxsoft.co.uk/coverage/report/web-components/latest"><img src="https://roxsoft.co.uk/coverage/badge/web-components/latest" alt="Coverage Badge"></a>
<a href="http://badge.fury.io/pl/Web-Components"><img src="https://badge.fury.io/pl/Web-Components.svg" alt="CPAN Badge"></a>
<a href="http://cpants.cpanauthors.org/dist/Web-Components"><img src="http://cpants.cpanauthors.org/dist/Web-Components.png" alt="Kwalitee Badge"></a>

=end html

=head1 Name

Web::Components - MVC pattern for Web::Simple

=head1 Synopsis

   package Component::Server;

   use Plack::Builder;
   use Web::Simple;

   with 'Web::Components::Loader';

=head1 Description

MVC pattern using L<Web::Simple>. See L<Web::Components::Loader> for
documentation. This was written to replace L<Catalyst> but L<Moo> all the
things

=head1 Configuration and Environment

Defines no attributes

=head1 Subroutines/Methods

Defines no methods

=head1 Diagnostics

None

=head1 Dependencies

=over 3

=item L<Exporter::Tiny>

=item L<HTTP::Message>

=item L<Module::Pluggable>

=item L<Moo>

=item L<Try::Tiny>

=item L<Unexpected>

=item L<Web::ComposableRequest>

=item L<Web::Simple>

=back

=head1 Incompatibilities

There are no known incompatibilities in this module

=head1 Bugs and Limitations

There are no known bugs in this module. Please report problems to
http://rt.cpan.org/NoAuth/Bugs.html?Dist=Web-Components.
Patches are welcome

=head1 Acknowledgements

Larry Wall - For the Perl programming language

=head1 Author

Peter Flanigan, C<< <pjfl@cpan.org> >>

=head1 License and Copyright

Copyright (c) 2024 Peter Flanigan. All rights reserved

This program is free software; you can redistribute it and/or modify it
under the same terms as Perl itself. See L<perlartistic>

This program is distributed in the hope that it will be useful,
but WITHOUT WARRANTY; without even the implied warranty of
MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE

=cut

# Local Variables:
# mode: perl
# tab-width: 3
# End:
# vim: expandtab shiftwidth=3:
