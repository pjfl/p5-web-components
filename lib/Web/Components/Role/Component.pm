package Web::Components::Role::Component;

use namespace::autoclean;

use Web::ComposableRequest::Constants qw( TRUE );
use Unexpected::Types                 qw( HashRef NonEmptySimpleStr
                                          NonNumericSimpleStr Object );
use Moo::Role;

has 'application' => is => 'ro',   isa => Object,
   handles        => [ 'config', 'debug', 'log' ], required => TRUE;

has 'components'  => is => 'ro',   isa => HashRef, default => sub { {} },
   weak_ref       => TRUE;

has 'encoding'    => is => 'lazy', isa => NonEmptySimpleStr,
   builder        => sub { $_[ 0 ]->config->encoding };

has 'moniker'     => is => 'ro',   isa => NonNumericSimpleStr, required => TRUE;

1;

__END__

=pod

=encoding utf-8

=head1 Name

Web::Components::Role::Component - One-line description of the modules purpose

=head1 Synopsis

   use Web::Components::Role::Component;
   # Brief but working code examples

=head1 Description

=head1 Configuration and Environment

Defines the following attributes;

=over 3

=back

=head1 Subroutines/Methods

=head1 Diagnostics

=head1 Dependencies

=over 3

=item L<Class::Usul>

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

Copyright (c) 2015 Peter Flanigan. All rights reserved

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
